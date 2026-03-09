import os

from models.messages.calculate_media_duration_message import CalculateMediaDurationMessage
from models.messages.response.media_duration_calculated import MediaDurationCalculated
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer
from utils.video_editing_utils import get_duration

PUBLISHER_EXCHANGE_NAME = 'calculate-media-duration'
CONSUMER_QUEUE_NAME = 'calculate-media-duration-consumer-queue'
RESPONSE_MESSAGE_TYPE = "scheme:media-duration-calculated"

def media_duration_handler(message: CalculateMediaDurationMessage):
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise Exception("MEDIA_SAVING_PATH variable is not specified")
    file_path = message.media_path
    absolute_path = os.path.join(saving_path, file_path)

    duration = get_duration(absolute_path)

    res = MediaDurationCalculated(
        duration=duration,
        media_path=file_path
    )

    return res

setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    MediaDurationCalculated: RESPONSE_MESSAGE_TYPE,
}

mediaDurationConsumer = BaseConsumer(
    setup, 
    CalculateMediaDurationMessage,
    responses,
    media_duration_handler
)

