import os

from models.messages.response.error.processing_error import ProcessingError
from models.messages.response.video_splitted import VideoSplitted
from models.messages.split_video_message import SplitVideoMessage
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer
from utils.video_editing_utils import split_video

PUBLISHER_EXCHANGE_NAME = 'split-video'
CONSUMER_QUEUE_NAME = 'split-video-consumer'
RESPONSE_MESSAGE_TYPE = "scheme:video-splitted"
ERROR_MESSAGE_TYPE = "scheme:processing-error"

def splitHandler(message: SplitVideoMessage):
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise Exception("MEDIA_SAVING_PATH variable is not specified")
    
    video_path = message.video_path

    absolute_video_path = os.path.join(saving_path, video_path)

    try:
        parts = split_video(absolute_video_path, os.path.dirname(absolute_video_path))
    except Exception as e:
        error_response = ProcessingError(error_message=str(e))
        return error_response
        

    parts = [os.path.relpath(part, saving_path) for part in parts]

    res = VideoSplitted(
        parts_file_paths=parts
    )
    return res

setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    VideoSplitted: RESPONSE_MESSAGE_TYPE,
    ProcessingError: ERROR_MESSAGE_TYPE
}

splitConsumer = BaseConsumer(
    setup, 
    SplitVideoMessage, 
    responses,
    splitHandler
)


