import asyncio
import json
import logging

import aio_pika
from pydantic import BaseModel

from config import rabbitmq_config

logger = logging.getLogger(__name__)

_connection: aio_pika.abc.AbstractRobustConnection | None = None
_connection_lock = asyncio.Lock()


async def _get_connection() -> aio_pika.abc.AbstractRobustConnection:
    global _connection
    async with _connection_lock:
        if _connection is None or _connection.is_closed:
            _connection = await aio_pika.connect_robust(rabbitmq_config.rabbitmq_url)
            logger.info("RabbitMQ broker connection established")
    return _connection


async def publish_event(exchange_name: str, message: BaseModel) -> None:
    """Publishes a message to a fanout exchange on RabbitMQ."""
    connection = await _get_connection()
    channel = await connection.channel()
    try:
        exchange = await channel.declare_exchange(
            exchange_name,
            aio_pika.ExchangeType.FANOUT,
            durable=True,
        )
        body = json.dumps(message.model_dump(by_alias=True)).encode()
        await exchange.publish(
            aio_pika.Message(body=body, content_type="application/json"),
            routing_key="",
        )
        logger.info(f"Published {exchange_name}: {body.decode()}")
    finally:
        await channel.close()
