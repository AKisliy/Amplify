import asyncio
import hashlib
import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated
from uuid import UUID

import aiohttp
from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.config import settings
from backend_template.database import async_session_maker, get_db
from backend_template.entities.job import NodeStatusChangedEvent, RunTemplateResponse
from backend_template.models.job import Job, JobStatus
from backend_template.models.node_execution import NodeExecution, NodeStatus
from backend_template.models.project_template import ProjectTemplate
from backend_template.models.template_version import TemplateVersion
from backend_template.utils.broker import publish_event
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

        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    f"{settings.engine_base_url}/api/prompt",
                    json={"prompt": comfy_prompt},
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

        # 6. Store prompt_id and mark job as PROCESSING
        job.prompt_id = prompt_id
        job.status = JobStatus.PROCESSING
        job.started_at = datetime.now(timezone.utc)
        await self.db.commit()

        # 7. Spawn background task: subscribe to ComfyUI WS and track execution
        asyncio.create_task(
            _listen_execution(
                prompt_id=prompt_id,
                job_id=str(job.id),
                user_id=user_id,
                comfy_prompt=comfy_prompt,
            )
        )

        return RunTemplateResponse(job_id=str(job.id), prompt_id=prompt_id)


# ── Background WS listener ────────────────────────────────────────────────────


async def _listen_execution(
    prompt_id: str,
    job_id: str,
    user_id: str,
    comfy_prompt: dict,  # kept for potential future use
) -> None:
    """Connects to the ComfyUI WebSocket and processes execution events."""
    client_id = str(uuid.uuid4())
    ws_url = (
        settings.engine_base_url
        .replace("http://", "ws://", 1)
        .replace("https://", "wss://", 1)
    )
    ws_url = f"{ws_url}/ws?clientId={client_id}"

    try:
        async with aiohttp.ClientSession() as session:
            async with session.ws_connect(
                ws_url,
                timeout=aiohttp.ClientWSTimeout(), 
            ) as ws:
                async for msg in ws:
                    if msg.type == aiohttp.WSMsgType.TEXT:
                        data = json.loads(msg.data)
                        done = await _handle_ws_event(
                            data=data,
                            prompt_id=prompt_id,
                            job_id=job_id,
                            user_id=user_id,
                        )
                        if done:
                            return
                    elif msg.type in (aiohttp.WSMsgType.CLOSED, aiohttp.WSMsgType.ERROR):
                        logger.warning(f"WS closed unexpectedly for prompt {prompt_id}")
                        break
    except aiohttp.ClientConnectorError:
        logger.error(f"Cannot connect to engine WS for prompt {prompt_id}")
    except Exception as e:
        logger.error(f"WS listener error for prompt {prompt_id}: {e}", exc_info=True)
    finally:
        await _ensure_job_terminal(job_id)


async def _handle_ws_event(
    data: dict,
    prompt_id: str,
    job_id: str,
    user_id: str,
) -> bool:
    """Processes one WS message. Returns True when execution is complete."""
    event_type = data.get("type")
    event_data = data.get("data", {})

    # Ignore events belonging to other prompts
    event_prompt_id = event_data.get("prompt_id")
    if event_prompt_id and event_prompt_id != prompt_id:
        return False

    if event_type == "executing":
        node_id = event_data.get("node")
        if node_id is None:
            return False  # null node = "wrapping up", wait for execution_success

        await _update_node_status(job_id, node_id, NodeStatus.RUNNING)
        await publish_event(
            "node-status-changed",
            NodeStatusChangedEvent(
                job_id=job_id, prompt_id=prompt_id, node_id=node_id,
                status="RUNNING", user_id=user_id,
            ),
        )

    elif event_type == "execution_cached":
        for node_id in event_data.get("nodes", []):
            await _update_node_status(job_id, node_id, NodeStatus.SUCCESS)
            await publish_event(
                "node-status-changed",
                NodeStatusChangedEvent(
                    job_id=job_id, prompt_id=prompt_id, node_id=node_id,
                    status="CACHED", user_id=user_id,
                ),
            )

    elif event_type == "executed":
        node_id = event_data.get("node")
        outputs = event_data.get("output", {})
        await _update_node_status(job_id, node_id, NodeStatus.SUCCESS, outputs=outputs)
        await publish_event(
            "node-status-changed",
            NodeStatusChangedEvent(
                job_id=job_id, prompt_id=prompt_id, node_id=node_id,
                status="SUCCESS", user_id=user_id, outputs=outputs,
            ),
        )

    elif event_type == "execution_error":
        node_id = event_data.get("node_id", "")
        error = event_data.get("exception_message", "Unknown error")
        await _update_node_status(job_id, node_id, NodeStatus.FAILURE, error_message=error)
        await _finish_job(job_id, JobStatus.FAILED)
        await publish_event(
            "node-status-changed",
            NodeStatusChangedEvent(
                job_id=job_id, prompt_id=prompt_id, node_id=node_id,
                status="FAILURE", user_id=user_id, error=error,
            ),
        )
        return True

    elif event_type == "execution_success":
        await _finish_job(job_id, JobStatus.COMPLETED)
        return True

    return False


# ── DB helpers (use a fresh session — called outside the request lifecycle) ────


async def _update_node_status(
    job_id: str,
    node_id: str,
    node_status: NodeStatus,
    outputs: dict | None = None,
    error_message: str | None = None,
) -> None:
    try:
        node_uuid = uuid.UUID(node_id)
        job_uuid = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return
    async with async_session_maker() as db:
        result = await db.execute(
            select(NodeExecution).where(
                NodeExecution.job_id == job_uuid,
                NodeExecution.node_id == node_uuid,
            )
        )
        ne = result.scalar_one_or_none()
        if ne:
            ne.status = node_status
            if outputs is not None:
                ne.outputs = outputs
            if error_message is not None:
                ne.error_message = error_message
            await db.commit()


async def _finish_job(job_id: str, final_status: JobStatus) -> None:
    job_uuid = uuid.UUID(job_id)
    async with async_session_maker() as db:
        result = await db.execute(select(Job).where(Job.id == job_uuid))
        job = result.scalar_one_or_none()
        if job and job.status == JobStatus.PROCESSING:
            job.status = final_status
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()


async def _ensure_job_terminal(job_id: str) -> None:
    """If the job is still PROCESSING when the WS closes, mark it FAILED."""
    job_uuid = uuid.UUID(job_id)
    async with async_session_maker() as db:
        result = await db.execute(select(Job).where(Job.id == job_uuid))
        job = result.scalar_one_or_none()
        if job and job.status == JobStatus.PROCESSING:
            job.status = JobStatus.FAILED
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()
            logger.warning(f"Job {job_id} marked FAILED — WS closed before completion")
