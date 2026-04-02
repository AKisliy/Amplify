import asyncio
import json
import logging
import uuid
from datetime import datetime, timezone

import aio_pika
from pydantic import BaseModel
from pydantic.alias_generators import to_camel
from pydantic import ConfigDict
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from backend_template.config import settings
from backend_template.database import async_session_maker
from backend_template.models.job import Job, JobStatus
from backend_template.models.node_execution import NodeExecution, NodeStatus

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "node-status-changed"
GRAPH_COMPLETED_EXCHANGE = "graph-completed"

_STATUS_MAP: dict[str, NodeStatus] = {
    "RUNNING": NodeStatus.RUNNING,
    "SUCCESS": NodeStatus.SUCCESS,
    "CACHED": NodeStatus.SUCCESS,
    "FAILURE": NodeStatus.FAILURE,
}


# ---------------------------------------------------------------------------
# Event model
# ---------------------------------------------------------------------------

class GraphCompletedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_id: str
    user_id: str
    template_id: str
    media_id: str | None = None
    media_type: str | None = None  # "video" | "image"


# ---------------------------------------------------------------------------
# Consumer loop
# ---------------------------------------------------------------------------

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
    user_id_str: str | None = data.get("userId") or data.get("user_id")
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
        await _finish_job(job_id_str, JobStatus.COMPLETED, user_id=user_id_str)
    elif job_status == "FAILED":
        await _finish_job(job_id_str, JobStatus.FAILED, user_id=user_id_str)


# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

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


async def _finish_job(job_id: str, final_status: JobStatus, *, user_id: str | None = None) -> None:
    try:
        job_uuid = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return

    async with async_session_maker() as db:
        result = await db.execute(
            select(Job)
            .options(selectinload(Job.template_version))
            .where(Job.id == job_uuid)
        )
        job = result.scalar_one_or_none()
        if not job or job.status == JobStatus.COMPLETED or job.status == JobStatus.FAILED:
            return

        job.status = final_status
        job.finished_at = datetime.now(timezone.utc)
        await db.commit()

        if final_status == JobStatus.COMPLETED and user_id:
            await _maybe_notify_graph_completed(job, job_uuid, user_id, db)


async def _maybe_notify_graph_completed(job: Job, job_uuid: uuid.UUID, user_id: str, db) -> None:
    """Publishes graph-completed if the graph has no AutoListPublishNode."""
    tv = job.template_version
    if tv is None:
        return

    graph_json = tv.graph_json or {}
    if _has_autolist_publish_node(graph_json):
        logger.info(f"Job {job_uuid}: AutoListPublishNode found — skipping graph-completed notification")
        return

    media_id, media_type = await _get_last_media_output(job_uuid, db)

    event = GraphCompletedEvent(
        job_id=str(job_uuid),
        user_id=user_id,
        template_id=str(tv.template_id),
        media_id=media_id,
        media_type=media_type,
    )
    await _publish_graph_completed(event)
    logger.info(f"Published graph-completed for job {job_uuid}, mediaId={media_id}")


def _has_autolist_publish_node(graph_json: dict) -> bool:
    return any(
        n.get("data", {}).get("schemaName") == "AutoListPublishNode"
        for n in graph_json.get("nodes", [])
    )


async def _get_last_media_output(job_uuid: uuid.UUID, db) -> tuple[str | None, str | None]:
    result = await db.execute(
        select(NodeExecution)
        .where(
            NodeExecution.job_id == job_uuid,
            NodeExecution.status == NodeStatus.SUCCESS,
            NodeExecution.outputs.isnot(None),
        )
        .order_by(NodeExecution.created_at.desc())
    )
    for ne in result.scalars():
        outputs = ne.outputs or {}
        video_uuids = outputs.get("video_uuid") or []
        if video_uuids:
            return video_uuids[0], "video"
        image_uuids = outputs.get("image_uuid") or []
        if image_uuids:
            return image_uuids[0], "image"
    return None, None


async def _publish_graph_completed(event: GraphCompletedEvent) -> None:
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            GRAPH_COMPLETED_EXCHANGE, aio_pika.ExchangeType.FANOUT, durable=True,
        )
        body = json.dumps(event.model_dump(by_alias=True)).encode()
        await exchange.publish(
            aio_pika.Message(body=body, content_type="application/json"),
            routing_key="",
        )
