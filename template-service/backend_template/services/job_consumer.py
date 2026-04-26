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
from backend_template.models.template_version import TemplateVersion

logger = logging.getLogger(__name__)

EXCHANGE_NAME = "node-status-changed"
FINAL_ASSET_GENERATED_EXCHANGE = "final-asset-generated"
GRAPH_COMPLETED_EXCHANGE = "graph-completed"

_STATUS_MAP: dict[str, NodeStatus] = {
    "RUNNING": NodeStatus.RUNNING,
    "SUCCESS": NodeStatus.SUCCESS,
    "CACHED": NodeStatus.SUCCESS,
    "FAILURE": NodeStatus.FAILURE,
    "WAITING_FOR_REVIEW": NodeStatus.WAITING_FOR_REVIEW,
}

# ---------------------------------------------------------------------------
# In-memory caches (keyed by job_id)
# Safe with exclusive queues: each consumer instance sees all messages in
# order, so only the instance that processed the node events will have
# entries here when JOB_COMPLETED arrives.
# ---------------------------------------------------------------------------
_last_media: dict[str, tuple[str, str]] = {}       # job_id → (media_id, media_type)


# ---------------------------------------------------------------------------
# Event models
# ---------------------------------------------------------------------------

class GraphCompletedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_id: str
    user_id: str


class FinalAssetGeneratedEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    id: str
    job_id: str
    user_id: str
    project_id: str
    template_id: str
    media_id: str
    media_type: str
    auto_list_ids: list[str] = []
    description: str


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

    job_id: str | None = data.get("jobId") or data.get("job_id")
    node_id: str | None = data.get("nodeId") or data.get("node_id")
    user_id: str | None = data.get("userId") or data.get("user_id")
    status_str: str = data.get("status", "")
    outputs: dict | None = data.get("outputs")
    error: str | None = data.get("error")
    job_status: str | None = data.get("jobStatus") or data.get("job_status")

    if not job_id:
        return

    if node_id:
        node_status = _STATUS_MAP.get(status_str)
        if node_status is not None:
            await _update_node_status(job_id, node_id, node_status, outputs=outputs, error_message=error)

        if node_status == NodeStatus.SUCCESS and outputs:
            media = _extract_media(outputs)
            if media:
                _last_media[job_id] = media
                logger.info(f"Job {job_id}: cached last media {media}")

    if job_status == "COMPLETED":
        await _finish_job(job_id, JobStatus.COMPLETED)
        if user_id:
            await _publish_graph_completed(job_id, user_id)
            media = _last_media.pop(job_id, None)
            if media:
                await _publish_final_asset_for_job(job_id, user_id, media[0], media[1])
            else:
                logger.info(f"Job {job_id}: no media output recorded, skipping final-asset-generated")

    elif job_status == "FAILED":
        await _finish_job(job_id, JobStatus.FAILED)
        _last_media.pop(job_id, None)


# ---------------------------------------------------------------------------
# Media extraction
# ---------------------------------------------------------------------------

def _extract_media(outputs: dict) -> tuple[str, str] | None:
    video_uuids = outputs.get("video_uuid") or []
    if video_uuids:
        return video_uuids[0], "video"
    image_uuids = outputs.get("image_uuid") or []
    if image_uuids:
        return image_uuids[0], "image"
    return None


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


async def _finish_job(job_id: str, final_status: JobStatus) -> None:
    try:
        job_uuid = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return

    async with async_session_maker() as db:
        result = await db.execute(select(Job).where(Job.id == job_uuid))
        job = result.scalar_one_or_none()
        if not job or job.status in (JobStatus.COMPLETED, JobStatus.FAILED):
            return
        job.status = final_status
        job.finished_at = datetime.now(timezone.utc)
        await db.commit()


# ---------------------------------------------------------------------------
# Event publishers
# ---------------------------------------------------------------------------

async def _publish_final_asset_for_job(
    job_id: str,
    user_id: str,
    media_id: str,
    media_type: str,
) -> None:
    try:
        job_uuid = uuid.UUID(job_id)
    except (ValueError, AttributeError):
        return

    async with async_session_maker() as db:
        result = await db.execute(
            select(Job)
            .options(selectinload(Job.template_version).selectinload(TemplateVersion.template))
            .where(Job.id == job_uuid)
        )
        job = result.scalar_one_or_none()
        if not job or not job.template_version or not job.template_version.template:
            logger.warning(f"Job {job_id}: could not load template context for final-asset-generated")
            return

        tv = job.template_version
        template = tv.template

    event = FinalAssetGeneratedEvent(
        id=str(uuid.uuid4()),
        job_id=job_id,
        user_id=user_id,
        project_id=str(template.project_id),
        template_id=str(tv.template_id),
        media_id=media_id,
        media_type=media_type,
        auto_list_ids=[str(aid) for aid in template.auto_list_ids],
        description=template.post_description_config.resolve()
    )
    connection = await aio_pika.connect_robust(settings.rabbitmq_url)
    async with connection:
        channel = await connection.channel()
        exchange = await channel.declare_exchange(
            FINAL_ASSET_GENERATED_EXCHANGE, aio_pika.ExchangeType.FANOUT, durable=True,
        )
        body = json.dumps(event.model_dump(by_alias=True)).encode()
        await exchange.publish(
            aio_pika.Message(body=body, content_type="application/json"),
            routing_key="",
        )
    logger.info(f"Published final-asset-generated for job {job_id}, mediaId={media_id}, assetId={event.id}")


async def _publish_graph_completed(job_id: str, user_id: str) -> None:
    event = GraphCompletedEvent(job_id=job_id, user_id=user_id)
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
    logger.info(f"Published graph-completed for job {job_id}")
