
from typing import TypeVar, Generic, Callable, Type
import pika
from pika.adapters.blocking_connection import BlockingChannel
from pydantic import BaseModel

from models.request_consumer_setup import RequestConsumerSetup
from utils.integration.masstransit_utils import createMassTransitResponse, getExchangeName
from utils.parser import parse_envelope

TMessage = TypeVar("TMessage")

class BaseConsumer(Generic[TMessage]):
    def __init__(self,
                 queue_setup: RequestConsumerSetup,
                 message_type: Type[TMessage],
                 possible_response_types: dict[Type, str],
                 handler: Callable[[TMessage], BaseModel]):
        self.setup = queue_setup
        self.handler = handler
        self.message_type = message_type
        self.response_types = possible_response_types

    def setup_queue(self, channel: BlockingChannel):
        channel.exchange_declare(exchange=self.setup.publisher_exchange_name, exchange_type='fanout', durable=True)
        channel.queue_declare(queue=self.setup.consumer_queue_name, exclusive=False, auto_delete=True, durable=False)
        channel.queue_bind(queue=self.setup.consumer_queue_name, exchange=self.setup.publisher_exchange_name)
        channel.basic_consume(queue=self.setup.consumer_queue_name, on_message_callback=self._on_message)

    def _on_message(self, ch: BlockingChannel, method, props, body):
        import traceback, logging, os

        logging.info(f"Message received - CorrelationId={props.correlation_id}")
        logging.debug(f"Message contents:\n'{body}'")

        envelope = parse_envelope(body, self.message_type)
        exchange = getExchangeName(envelope)
        logging.debug(f"Exchange extracted: '{exchange}'")

        try:
            if not isinstance(envelope.message, self.message_type):
                raise Exception(f"Incorrect message format. Expected {self.message_type.__name__}, got {type(envelope.message).__name__}")

            result = self.handler(envelope.message)

            scheme_name = self.response_types.get(type(result), "")
            
            if not scheme_name:
                raise Exception(f"Result of type {type(result)} wasn't specified as possible return params")

            response_body = createMassTransitResponse(result, envelope, scheme_name)
            ch.basic_publish(
                exchange=exchange,
                routing_key=exchange,
                properties=pika.BasicProperties(correlation_id=props.correlation_id),
                body=response_body
            )

        except Exception as e:
            logging.error("Error: %s", e)
            logging.error(traceback.format_exc())

        finally:
            ch.basic_ack(delivery_tag=method.delivery_tag)
            logging.info("Message handling complete")
