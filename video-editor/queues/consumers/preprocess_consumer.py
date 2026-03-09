import os
import traceback
import logging

from factory.preprocessor_factory import PreprocessorFactory
from models.messages.base_preprocess_video_message import BasePrepocessVideoMessage
from models.messages.response.preprocessing_error import PreprocessingError
from models.messages.response.processed_file_response import ProcesedFileResponse
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer

PUBLISHER_EXCHANGE_NAME = 'preprocess-video'
CONSUMER_QUEUE_NAME = 'preprocess-video-consumer-queue'
RESPONSE_MESSAGE_TYPE = "scheme:video-preprocessed"
ERROR_RESPONSE_TYPE = "scheme:video-preprocessing-faulted"

def preprocess_handler(message: BasePrepocessVideoMessage):
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise Exception("MEDIA_SAVING_PATH variable is not specified")
    file_path = message.file_path
    file_type = message.file_type
    
    try:
        factory = PreprocessorFactory()
        preprocessor = factory.get_preprocessor(file_type)
        result = preprocessor.preproccess_file(file_path, saving_path)

        return result
    
    except Exception as e:
        logging.error("error {0}".format(e))
        logging.error(traceback.format_exc())
        error_result = PreprocessingError(
            file_path=file_path,
            reason=str(e)
        )

        return error_result
    
setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    ProcesedFileResponse: RESPONSE_MESSAGE_TYPE,
    PreprocessingError: ERROR_RESPONSE_TYPE
}

preprocessConsumer = BaseConsumer(
    setup,
    BasePrepocessVideoMessage,
    responses,
    preprocess_handler
)

