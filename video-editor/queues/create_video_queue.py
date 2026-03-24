import logging

from pika.adapters.blocking_connection import BlockingChannel

from models.messages.base_create_video_message import BaseCreateVideoMessage
from tasks.create_video import create_video
from utils.parser import parse_message

logger = logging.getLogger(__name__)

PUBLISHER_EXCHANGE_NAME = "generate-video"
CONSUMER_QUEUE_NAME = "generate-video-consumer"


def setup_create_video_queue(channel: BlockingChannel):
    channel.exchange_declare(exchange=PUBLISHER_EXCHANGE_NAME, exchange_type="fanout", durable=True)
    channel.queue_declare(queue=CONSUMER_QUEUE_NAME, exclusive=False, auto_delete=True, durable=False)
    channel.queue_bind(queue=CONSUMER_QUEUE_NAME, exchange=PUBLISHER_EXCHANGE_NAME)
    channel.basic_consume(queue=CONSUMER_QUEUE_NAME, on_message_callback=_on_message)


def _on_message(ch: BlockingChannel, method, props, body):
    try:
        message = parse_message(body, BaseCreateVideoMessage)
    except Exception as e:
        logger.error(f"Failed to parse message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
        return

    create_video.delay(message.model_dump())
    ch.basic_ack(delivery_tag=method.delivery_tag)
    logger.info(f"Dispatched video task {message.video_id} to Celery")
