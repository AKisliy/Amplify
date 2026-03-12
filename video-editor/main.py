import logging
import os
import sys
import pika

from queues.create_video_queue import setup_create_video_queue
from queues.consumers.extract_download_link_consumer import extractLinkConsumer
from queues.consumers.convert_file_consumer import convertConsumer
from queues.consumers.preprocess_consumer import preprocessConsumer
from queues.consumers.scene_changes_consumer import detectScenesConsumer
from queues.consumers.get_media_duration_consumer import mediaDurationConsumer
from queues.consumers.video_hash_consumer import videoHashConsumer
from queues.consumers.split_consumer import splitConsumer
from queues.consumers.normalize_video_consumer import normalizeConsumer
from pika.adapters.blocking_connection import BlockingChannel
from dotenv import load_dotenv

def setup_request_consumers(channel: BlockingChannel):
    preprocessConsumer.setup_queue(channel)
    extractLinkConsumer.setup_queue(channel)
    detectScenesConsumer.setup_queue(channel)
    mediaDurationConsumer.setup_queue(channel)
    convertConsumer.setup_queue(channel)
    videoHashConsumer.setup_queue(channel)
    splitConsumer.setup_queue(channel)
    normalizeConsumer.setup_queue(channel)

def setup_rabbitmq_connection() -> pika.BlockingConnection:
    amqp_url = os.getenv("AMQP_URL")
    if amqp_url:
        params = pika.URLParameters(amqp_url)
        params.heartbeat = 0
    else:
        username = os.getenv("RABBITMQ_DEFAULT_USER", "guest")
        password = os.getenv("RABBITMQ_DEFAULT_PASS", "guest")
        host = os.getenv("RABBITMQ_HOST", "localhost")
        port = int(os.getenv("RABBITMQ_PORT", 5672))
        params = pika.ConnectionParameters(
            host=host, port=port,
            credentials=pika.PlainCredentials(username, password),
            heartbeat=0,
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

connection = setup_rabbitmq_connection()
channel = connection.channel()

setup_request_consumers(channel)
setup_create_video_queue(channel)

logging.info("Waiting for messages")

channel.start_consuming()