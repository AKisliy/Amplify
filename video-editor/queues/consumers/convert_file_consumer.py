import os

from factory.converter_factory import ConverterFactory
from models.messages.convert_file_to_constraints_message import ConvertFileToConstraintsMessage
from models.messages.response.media_converted import MediaConverted
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer

PUBLISHER_EXCHANGE_NAME = 'convert-media'
CONSUMER_QUEUE_NAME = 'convert-media-consumer-queue'
RESPONSE_MESSAGE_TYPE = "scheme:media-converted"

def convertHandler(message: ConvertFileToConstraintsMessage):
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise Exception("MEDIA_SAVING_PATH variable is not specified")
    
    file_path = message.media_path
    output_path = message.output_path
    constraints = message.constraints
    
    factory = ConverterFactory()
    converter = factory.get_converter(constraints)

    absolute_path = os.path.join(saving_path, file_path)
    absolute_output_path = os.path.join(saving_path, output_path)

    converter.convert_media_from_path(absolute_path, absolute_output_path)

    res = MediaConverted(
        output_path=output_path
    )
    return res

setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    MediaConverted: RESPONSE_MESSAGE_TYPE,
}

convertConsumer = BaseConsumer(
    setup, 
    ConvertFileToConstraintsMessage, 
    responses,
    convertHandler
)


