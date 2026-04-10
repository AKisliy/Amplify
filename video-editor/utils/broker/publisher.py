import json
import logging
import os

import pika


def publish_message(exchange_name: str, body: dict) -> None:
    """Publish a raw JSON message to a fanout exchange."""
    amqp_url = os.getenv("AMQP_URL")
    if amqp_url:
        params = pika.URLParameters(amqp_url)
    else:
        params = pika.ConnectionParameters(
            host=os.getenv("RABBITMQ_HOST", "localhost"),
            port=int(os.getenv("RABBITMQ_PORT", 5672)),
            credentials=pika.PlainCredentials(
                os.getenv("RABBITMQ_DEFAULT_USER", "guest"),
                os.getenv("RABBITMQ_DEFAULT_PASS", "guest"),
            ),
        )

    connection = pika.BlockingConnection(params)
    try:
        channel = connection.channel()
        channel.exchange_declare(exchange=exchange_name, exchange_type="fanout", durable=True)
        channel.basic_publish(
            exchange=exchange_name,
            routing_key="",
            body=json.dumps(body).encode(),
            properties=pika.BasicProperties(content_type="application/json", delivery_mode=2),
        )
        logging.info("Published message to exchange '%s'", exchange_name)
    finally:
        connection.close()
