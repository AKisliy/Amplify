import logging
import os
import sys
import threading
import pika
import uvicorn

from queues.create_video_queue import setup_create_video_queue
from queues.consumers.convert_file_consumer import convertConsumer
from queues.consumers.preprocess_consumer import preprocessConsumer
from queues.consumers.scene_changes_consumer import detectScenesConsumer
from queues.consumers.get_media_duration_consumer import mediaDurationConsumer
from queues.consumers.video_hash_consumer import videoHashConsumer
from queues.consumers.split_consumer import splitConsumer
from queues.consumers.normalize_video_consumer import normalizeConsumer
import queues.consumers.process_media_consumer as process_media_consumer
from pika.adapters.blocking_connection import BlockingChannel
from dotenv import load_dotenv

from celery_app import app


def setup_request_consumers(channel: BlockingChannel):
    preprocessConsumer.setup_queue(channel)
    detectScenesConsumer.setup_queue(channel)
    mediaDurationConsumer.setup_queue(channel)
    convertConsumer.setup_queue(channel)
    videoHashConsumer.setup_queue(channel)
    splitConsumer.setup_queue(channel)
    normalizeConsumer.setup_queue(channel)
    process_media_consumer.setup_queue(channel)

HEARTBEAT = 60  # seconds — keeps SSL connection alive through proxies / Istio


def setup_rabbitmq_connection() -> pika.BlockingConnection:
    amqp_url = os.getenv("AMQP_URL")
    if amqp_url:
        params = pika.URLParameters(amqp_url)
        params.heartbeat = HEARTBEAT
    else:
        username = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
        password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
        host = os.getenv("RABBITMQ_HOST", "localhost")
        port = int(os.getenv("RABBITMQ_PORT", 5672))
        params = pika.ConnectionParameters(
            host=host, port=port,
            credentials=pika.PlainCredentials(username, password),
            heartbeat=HEARTBEAT,
        )
    return pika.BlockingConnection(params)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(threadName)-12.12s] [%(levelname)-5.5s]  %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ])

logger = logging.getLogger()

load_dotenv()


def run_rabbitmq():
    retry_delay = 5
    while True:
        try:
            connection = setup_rabbitmq_connection()
            channel = connection.channel()
            setup_request_consumers(channel)
            setup_create_video_queue(channel)
            logging.info("Waiting for messages")
            retry_delay = 5  # reset on successful connection
            channel.start_consuming()
        except Exception as exc:
            logging.error("RabbitMQ connection lost (%s), reconnecting in %ss...", exc, retry_delay)
            import time
            time.sleep(retry_delay)
            retry_delay = min(retry_delay * 2, 60)  # exponential backoff, cap at 60s


rabbitmq_thread = threading.Thread(target=run_rabbitmq, daemon=True)
rabbitmq_thread.start()

root_path = os.getenv("ROOT_PATH", "")
uvicorn.run("api:api", host="0.0.0.0", port=8000, root_path=root_path, forwarded_allow_ips="*")