import asyncio
import json
import logging

import aio_pika
from pydantic import BaseModel

from config import rabbitmq_config

logger = logging.getLogger(__name__)

_connection: aio_pika.abc.AbstractRobustConnection | None = None
_connection_loop: asyncio.AbstractEventLoop | None = None


async def _get_connection() -> aio_pika.abc.AbstractRobustConnection:
    global _connection, _connection_loop

    loop = asyncio.get_running_loop()

    # Reconnect if no connection, closed, or created in a different event loop
    if _connection is None or _connection.is_closed or _connection_loop is not loop:
        _connection = await aio_pika.connect_robust(rabbitmq_config.rabbitmq_url)
        _connection_loop = loop
        logger.info("RabbitMQ broker connection established (loop=%s)", id(loop))

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
