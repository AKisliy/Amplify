"""
RabbitMQ helper for the Template Service web application.

Uses ``backend_template.config.settings.rabbitmq_url`` — *not* the engine's
config — so this module is safe to import in any FastAPI context without
pulling in ComfyUI engine dependencies.
"""

import json
import logging

import aio_pika
from pydantic import BaseModel

from backend_template.config import settings

logger = logging.getLogger(__name__)

# Fanout exchange for Library Template lifecycle events.
TEMPLATE_EVENTS_EXCHANGE = "template.events"

# Fanout exchange for Project Template lifecycle events.
PROJECT_TEMPLATE_EVENTS_EXCHANGE = "project_template.events"


async def publish_event(exchange_name: str, message: BaseModel) -> None:
    """
    Publishes a Pydantic model as JSON to a durable fanout exchange on RabbitMQ.

    Failures are logged but **never re-raised** — event publishing is best-effort
    and must not break the main request flow. If reliable delivery is required
    in the future, add an outbox pattern here.

    Args:
        exchange_name: Name of the RabbitMQ fanout exchange to publish to.
        message: Any Pydantic model; serialised to JSON via ``model_dump``.
    """
    try:
        connection = await aio_pika.connect_robust(settings.rabbitmq_url)
        async with connection:
            channel = await connection.channel()
            exchange = await channel.declare_exchange(
                exchange_name,
                aio_pika.ExchangeType.FANOUT,
                durable=True,
            )
            body = json.dumps(message.model_dump(mode="json", by_alias=True)).encode()
            await exchange.publish(
                aio_pika.Message(body=body, content_type="application/json"),
                routing_key="",
            )
            logger.info("Published to %s: %s", exchange_name, body.decode())
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to publish event to %s: %s", exchange_name, exc)
