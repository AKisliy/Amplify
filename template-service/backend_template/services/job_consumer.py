import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

import aio_pika
from sqlalchemy import select

from backend_template.config import settings
from backend_template.database import async_session_maker
from backend_template.models.job import Job, JobStatus
from backend_template.models.node_execution import NodeExecution, NodeStatus

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "node-status-changed"

_STATUS_MAP: dict[str, NodeStatus] = {
    "RUNNING": NodeStatus.RUNNING,
    "SUCCESS": NodeStatus.SUCCESS,
    "CACHED": NodeStatus.SUCCESS,
    "FAILURE": NodeStatus.FAILURE,
}


async def consume_job_events() -> None:
    """Background task: subscribes to node-status-changed and updates the DB."""
    while True:
        try:
            connection = await aio_pika.connect_robust(settings.rabbitmq_url)
            async with connection:
                channel = await connection.channel()
                exchange = await channel.declare_exchange(
                    EXCHANGE_NAME, aio_pika.ExchangeType.FANOUT, durable=True,
                )
                queue = await channel.declare_queue(exclusive=True)
                await queue.bind(exchange)
                logger.info("Job event consumer started")
                async with queue.iterator() as qiterator:
                    async for message in qiterator:
                        async with message.process():
                            try:
                                data = json.loads(message.body)
                                await _handle_event(data)
                            except Exception as e:
                                logger.error(f"Error processing job event: {e}", exc_info=True)
        except asyncio.CancelledError:
            logger.info("Job event consumer stopped")
            return
        except Exception as e:
            logger.error(f"RabbitMQ consumer error, reconnecting in 5s: {e}")
            await asyncio.sleep(5)


async def _handle_event(data: dict) -> None:
    logger.info(f"Received job event: {data}")

    job_id_str: str | None = data.get("jobId") or data.get("job_id")
    node_id_str: str | None = data.get("nodeId") or data.get("node_id")
    status_str: str = data.get("status", "")
    outputs: dict | None = data.get("outputs")
    error: str | None = data.get("error")
    job_status: str | None = data.get("jobStatus") or data.get("job_status")

    if not job_id_str:
        return

    if node_id_str:
        node_status = _STATUS_MAP.get(status_str)
        if node_status is not None:
            await _update_node_status(job_id_str, node_id_str, node_status, outputs=outputs, error_message=error)

    if job_status == "COMPLETED":
        await _finish_job(job_id_str, JobStatus.COMPLETED)
    elif job_status == "FAILED":
        await _finish_job(job_id_str, JobStatus.FAILED)


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
    try:
        job_uuid = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return
    async with async_session_maker() as db:
        result = await db.execute(select(Job).where(Job.id == job_uuid))
        job = result.scalar_one_or_none()
        if job and job.status == JobStatus.PROCESSING:
            job.status = final_status
            job.finished_at = datetime.now(timezone.utc)
            await db.commit()
