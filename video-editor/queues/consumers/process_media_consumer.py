import logging

from pika.adapters.blocking_connection import BlockingChannel

from models.messages.process_media_command import ProcessMediaCommand
from tasks.process_media import process_media

EXCHANGE_NAME = "media-process-requested"
QUEUE_NAME = "video-editor-process-media"


def setup_queue(channel: BlockingChannel):
    channel.exchange_declare(exchange=EXCHANGE_NAME, exchange_type="fanout", durable=True)
    channel.queue_declare(queue=QUEUE_NAME, durable=True)
    channel.queue_bind(queue=QUEUE_NAME, exchange=EXCHANGE_NAME)
    channel.basic_qos(prefetch_count=1)
    channel.basic_consume(queue=QUEUE_NAME, on_message_callback=_on_message)
    logging.info("Consumer ready on exchange '%s', queue '%s'", EXCHANGE_NAME, QUEUE_NAME)


def _on_message(ch: BlockingChannel, method, props, body: bytes):
    logging.info("Received message on '%s'", EXCHANGE_NAME)
    try:
        message = ProcessMediaCommand.model_validate_json(body)
        process_media.delay(str(message.media_id), message.file_key, message.content_type)
        logging.info("Dispatched process_media task for MediaId=%s", message.media_id)
    except Exception:
        import traceback
        logging.error("Failed to dispatch process_media task:\n%s", traceback.format_exc())
    finally:
        ch.basic_ack(delivery_tag=method.delivery_tag)
