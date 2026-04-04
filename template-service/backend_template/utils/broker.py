import json
import logging

import aio_pika
from pydantic import BaseModel

from backend_template.engine.config import rabbitmq_config

logger = logging.getLogger(__name__)


async def publish_event(exchange_name: str, message: BaseModel) -> None:
    """Publishes a Pydantic model as JSON to a durable fanout exchange on RabbitMQ."""
    try:
        connection = await aio_pika.connect_robust(rabbitmq_config.rabbitmq_url)
        async with connection:
            channel = await connection.channel()
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
            logger.info(f"Published to {exchange_name}: {body.decode()}")
    except Exception as e:
        logger.error(f"Failed to publish event to {exchange_name}: {e}")
