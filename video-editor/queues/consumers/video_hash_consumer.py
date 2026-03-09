import os
from models.messages.calculate_video_hash_message import CalculateVideoHashMessage
from models.messages.response.video_hash_calculated import VideoHashCalculated
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer
from utils.video_hasher import find_similar_video


PUBLISHER_EXCHANGE_NAME = 'calculate-hash'
CONSUMER_QUEUE_NAME = 'calculate-hash-consumer-queue'
RESPONSE_MESSAGE_TYPE = "scheme:hash-calculated"

def convertHandler(message: CalculateVideoHashMessage):
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise Exception("MEDIA_SAVING_PATH variable is not specified")
    
    absolute_path = os.path.join(saving_path, message.video_path)
    
    similar_video = find_similar_video(absolute_path)

    res = VideoHashCalculated(
        similar_file_id=similar_video.file_id,
        frame_hashes=similar_video.hashes,
        frame_numbers=similar_video.frame_numbers
    )
    
    return res

setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    VideoHashCalculated: RESPONSE_MESSAGE_TYPE,
}

videoHashConsumer = BaseConsumer(
    setup, 
    CalculateVideoHashMessage, 
    responses,
    convertHandler
)
