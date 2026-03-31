import hashlib
import json
import logging
import uuid
from uuid import UUID
from typing import Annotated

import aiohttp
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.config import settings
from backend_template.database import get_db
from backend_template.entities.job import RunTemplateResponse
from backend_template.models.job import Job, JobStatus
from backend_template.models.node_execution import NodeExecution, NodeStatus
from backend_template.models.project_template import ProjectTemplate
from backend_template.models.template_version import TemplateVersion
from backend_template.utils.graph import convert_reactflow_to_comfy

logger = logging.getLogger(__name__)


class JobService:
    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        self.db = db

    async def run_template(self, template_id: UUID, user_id: str) -> RunTemplateResponse:
        template = await self.db.get(ProjectTemplate, template_id)
        if not template:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")

        graph: dict = template.current_graph_json
        if not graph:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Template graph is empty")

        # find existing version by hash or create a new one
        graph_str = json.dumps(graph, sort_keys=True)
        version_hash = hashlib.sha256(graph_str.encode()).hexdigest()

        result = await self.db.execute(
            select(TemplateVersion).where(TemplateVersion.version_hash == version_hash)
        )
        template_version = result.scalar_one_or_none()

        if not template_version:
            template_version = TemplateVersion(
                template_id=template.id,
                graph_json=graph,
                version_hash=version_hash,
                created_by=user_id,
            )
            self.db.add(template_version)
            await self.db.flush()

        # Convert ReactFlow graph to ComfyUI prompt format
        comfy_prompt = convert_reactflow_to_comfy(graph)

        job = Job(
            template_version_id=template_version.id,
            status=JobStatus.QUEUED,
        )
        self.db.add(job)
        await self.db.flush()

        # Create NodeExecution record for each node
        for node_id, node_def in comfy_prompt.items():
            class_type = node_def.get("class_type", "Unknown")
            try:
                node_uuid = uuid.UUID(node_id)
            except ValueError:
                node_uuid = uuid.uuid5(uuid.NAMESPACE_OID, node_id)
            self.db.add(NodeExecution(
                job_id=job.id,
                node_id=node_uuid,
                class_name=class_type,
                status=NodeStatus.PENDING,
                inputs=node_def.get("inputs"),
            ))

        await self.db.commit()
        await self.db.refresh(job)

        # Submit to engine.  Pass job_id in extra_data so the engine can include
        # it in RabbitMQ events; client_id is the user_id for potential WS routing.
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{settings.engine_base_url}/api/prompt",
                    json={
                        "prompt": comfy_prompt,
                        "client_id": user_id,
                        "extra_data": {"job_id": str(job.id)},
                    },
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    body = await resp.json()
                    if resp.status >= 400:
                        job.status = JobStatus.FAILED
                        await self.db.commit()
                        raise HTTPException(status_code=resp.status, detail=body)
                    prompt_id: str = body["prompt_id"]
        except aiohttp.ClientConnectorError:
            job.status = JobStatus.FAILED
            await self.db.commit()
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Engine is not available",
            )

        job.prompt_id = prompt_id
        job.status = JobStatus.PROCESSING
        await self.db.commit()

        return RunTemplateResponse(job_id=str(job.id), prompt_id=prompt_id)
