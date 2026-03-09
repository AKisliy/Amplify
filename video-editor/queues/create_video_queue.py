import logging
import os
import traceback
import pika
from pika.adapters.blocking_connection import BlockingChannel

from factory.editor_factory import EditorFactory
from models.messages.base_create_video_message import BaseCreateVideoMessage
from models.video_generated import VideoGenerated
from utils.integration.masstransit_utils import createMassTransitResponse
from utils.parser import parse_message


RESPONSE_SCHEME_NAME="scheme:video-generated"
PUBLISHER_EXCHANGE_NAME = 'generate-video'
CONSUMER_QUEUE_NAME = 'generate-video-consumer'
RESPONSE_EXCHANGE_NAME = "video-generated"

def setup_create_video_queue(channel: BlockingChannel):
    channel.exchange_declare(exchange=PUBLISHER_EXCHANGE_NAME, exchange_type='fanout', durable=True)
    channel.queue_declare(queue=CONSUMER_QUEUE_NAME,
                        exclusive=False,
                        auto_delete=True,
                        durable=False)
    channel.queue_bind(queue=CONSUMER_QUEUE_NAME, exchange=PUBLISHER_EXCHANGE_NAME)
    channel.basic_consume(queue=CONSUMER_QUEUE_NAME, on_message_callback=create_video_callback)

def create_video_callback(ch: BlockingChannel, method, props, body):
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise Exception("MEDIA_SAVING_PATH variable is not specified")
    try:
        # request = json.loads(body.decode('UTF-8'))
        envelope = parse_message(body, BaseCreateVideoMessage)

        if type(envelope.message) is not BaseCreateVideoMessage:
            raise Exception("Incorrect message format provided")

        factory = EditorFactory()
        editor = factory.get_video_editor(envelope.message.video_format)
        
        output_path = editor.edit_video(envelope.message.creation_args, saving_path)
        
        result = VideoGenerated(
           video_id=envelope.message.video_id,
           status="Success",
           output_path=output_path,
           error=""
        )

        responseBody = createMassTransitResponse(result, envelope, RESPONSE_SCHEME_NAME)
        logging.debug("Response body for MassTransit:\n'{0}'".format(responseBody))

        ch.basic_publish(RESPONSE_EXCHANGE_NAME, 
            routing_key = "", 
            properties = pika.BasicProperties(correlation_id = props.correlation_id),
            body = responseBody)
        logging.info("Compelted for video {VideoId}", envelope.message.video_id)
    except Exception as e:
        logging.error("error {0}".format(e))
        logging.error(traceback.format_exc())

    ch.basic_ack(delivery_tag = method.delivery_tag)
    logging.info("Message handling complete")