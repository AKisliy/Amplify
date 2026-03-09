import logging
import traceback
from typing import TypeVar, Generic, Callable, Type

import pika
from pika.adapters.blocking_connection import BlockingChannel
from pydantic import BaseModel

TMessage = TypeVar("TMessage", bound=BaseModel)


class RawJsonConsumer(Generic[TMessage]):
    """
    Consumer for messages published without MassTransit envelope (raw JSON).
    Used for messages sent with UseRawJsonSerializer in MassTransit.
    """

    def __init__(
        self,
        exchange_name: str,
        queue_name: str,
        message_type: Type[TMessage],
        handler: Callable[[TMessage], None],
    ):
        self.exchange_name = exchange_name
        self.queue_name = queue_name
        self.message_type = message_type
        self.handler = handler

    def setup_queue(self, channel: BlockingChannel):
        channel.exchange_declare(exchange=self.exchange_name, exchange_type="fanout", durable=True)
        channel.queue_declare(queue=self.queue_name, durable=True)
        channel.queue_bind(queue=self.queue_name, exchange=self.exchange_name)
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=self.queue_name, on_message_callback=self._on_message)
        logging.info("Consumer ready on exchange '%s', queue '%s'", self.exchange_name, self.queue_name)

    def _on_message(self, ch: BlockingChannel, method, props, body: bytes):
        logging.info("Received message on '%s'", self.exchange_name)
        logging.debug("Body: %s", body)
        try:
            message = self.message_type.model_validate_json(body)
            self.handler(message)
        except Exception:
            logging.error("Error handling message:\n%s", traceback.format_exc())
        finally:
            ch.basic_ack(delivery_tag=method.delivery_tag)
            logging.info("Message acknowledged")
