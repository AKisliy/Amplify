import aiohttp
import hashlib
import json
import logging
import os
import uuid
from dataclasses import dataclass, field
from uuid import UUID
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend_template.config import settings
from backend_template.database import get_db
from backend_template.temporal.client import get_temporal_client
from backend_template.temporal.workflows.graph import GraphWorkflow, GraphWorkflowParams
from backend_template.entities.job import JobDetailResponse, RunTemplateResponse
from backend_template.models.job import Job, JobStatus
from backend_template.models.node_execution import NodeExecution, NodeStatus
from backend_template.models.product import Product
from backend_template.models.project_template import ProjectTemplate
from backend_template.models.template_version import TemplateVersion
from backend_template.utils.graph import convert_reactflow_to_comfy

logger = logging.getLogger(__name__)

DEV_MODE = os.getenv("DEV_MODE", "").lower() in ("1", "true", "yes")


@dataclass
class _PreparedJob:
    job: Job
    template_id: UUID
    comfy_prompt: dict
    project_id: str
    product_context: dict = field(default_factory=dict)


class JobService:
    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        self.db = db

    async def get_job_detail(self, job_id: UUID) -> JobDetailResponse:
        """Load a Job with all its NodeExecution records from the DB."""
        result = await self.db.execute(
            select(Job)
            .options(selectinload(Job.node_executions))
            .where(Job.id == job_id)
        )
        job = result.scalar_one_or_none()
        if not job:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Job not found")
        return JobDetailResponse.model_validate(job)

    async def _prepare_job(self, template_id: UUID, user_id: str) -> _PreparedJob:
        """
        Common setup for both v1 (ComfyUI) and v2 (Temporal) execution paths:
        - resolve template + version
        - convert graph to ComfyUI prompt format
        - create Job + NodeExecution records
        - resolve product context
        Does NOT commit — callers commit after submitting to the execution backend.
        """
        template = await self.db.get(ProjectTemplate, template_id)
        if not template:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Template not found")

        graph: dict = template.current_graph_json
        if not graph:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Template graph is empty")

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

        if DEV_MODE:
            comfy_prompt = graph
            logger.debug("[DEV_MODE] Skipping ReactFlow conversion — using graph as-is")
        else:
            comfy_prompt = convert_reactflow_to_comfy(graph)

        logger.debug("Comfy prompt:\n%s", json.dumps(comfy_prompt, indent=2))

        job = Job(template_version_id=template_version.id, status=JobStatus.QUEUED)
        self.db.add(job)
        await self.db.flush()

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

        product_context: dict = {}
        if template.product_id:
            result = await self.db.execute(
                select(Product)
                .where(Product.id == template.product_id)
                .options(selectinload(Product.images), selectinload(Product.store_links))
            )
            product = result.scalar_one_or_none()
            if product:
                product_context = {
                    "id": str(product.id),
                    "name": product.name,
                    "description": product.description,
                    "store_links": [
                        {"platform": sl.platform, "url": sl.url}
                        for sl in product.store_links
                    ],
                    "image_uuids": [str(img.media_uuid) for img in product.images],
                }

        return _PreparedJob(
            job=job,
            template_id=template.id,
            comfy_prompt=comfy_prompt,
            project_id=str(template.project_id),
            product_context=product_context,
        )

    async def run_template(self, template_id: UUID, user_id: str) -> RunTemplateResponse:
        """V1 path: submit to ComfyUI engine via aiohttp."""
        prepared = await self._prepare_job(template_id, user_id)
        job = prepared.job

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{settings.engine_base_url}/api/prompt",
                    json={"prompt": prepared.comfy_prompt, "client_id": str(job.id)},
                    timeout=aiohttp.ClientTimeout(total=30),
                ) as resp:
                    body = await resp.json()
                    if resp.status >= 400:
                        raise HTTPException(status_code=resp.status, detail=body)
                    prompt_id = body.get("prompt_id", str(job.id))
        except aiohttp.ClientConnectorError:
            job.status = JobStatus.FAILED
            await self.db.commit()
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Engine is not available",
            )

        await self.db.commit()
        return RunTemplateResponse(job_id=str(job.id), prompt_id=prompt_id)

    async def run_template_temporal(self, template_id: UUID, user_id: str) -> RunTemplateResponse:
        """V2 path: submit to Temporal workflow engine."""
        prepared = await self._prepare_job(template_id, user_id)
        job = prepared.job

        logger.info("Submitting Temporal job %s for project=%s", job.id, prepared.project_id)

        try:
            temporal_client = await get_temporal_client()
            await temporal_client.start_workflow(
                GraphWorkflow.run,
                GraphWorkflowParams(
                    job_id=str(job.id),
                    user_id=user_id,
                    graph_json=prepared.comfy_prompt,
                    template_id=str(prepared.template_id),
                    project_id=prepared.project_id,
                    product_context=prepared.product_context,
                ),
                id=str(job.id),
                task_queue=settings.temporal_task_queue,
            )
        except Exception as exc:
            job.status = JobStatus.FAILED
            await self.db.commit()
            logger.error("Failed to start Temporal workflow for job %s: %s", job.id, exc)
            raise HTTPException(
                status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Workflow engine is not available",
            )

        await self.db.commit()
        return RunTemplateResponse(job_id=str(job.id), prompt_id=str(job.id))
