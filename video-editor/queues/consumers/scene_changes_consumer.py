import os

from models.messages.detect_scene_changes_message import DetectSceneChangesMessage
from models.messages.response.error.processing_error import ProcessingError
from models.messages.response.scene_changes_detected import SceneChangesDetected
from models.request_consumer_setup import RequestConsumerSetup
from queues.consumers.base_consumer import BaseConsumer
from utils.scene_changes_detector import get_changes_timecodes

PUBLISHER_EXCHANGE_NAME = 'detect-scene-changes'
CONSUMER_QUEUE_NAME = 'detect-scene-changes-consumer-queue'
RESPONSE_MESSAGE_TYPE = "scheme:scene-changes-detected"
ERROR_MESSAGE_TYPE = "scheme:processing-error"

def detect_scene_changes_handler(message: DetectSceneChangesMessage):
    try:
        saving_path = os.getenv("MEDIA_SAVING_PATH")
        if not saving_path:
            raise Exception("MEDIA_SAVING_PATH variable is not specified")
        file_path = message.file_path
        target_path = os.path.join(saving_path, file_path)
        scene_timecodes = get_changes_timecodes(target_path)
        scene_changes: list[float] = []
        for scene in scene_timecodes[1:]:
            scene_changes.append(scene[0].get_seconds())

        result = SceneChangesDetected(
            file_path=file_path,
            scene_changes=scene_changes
        )

        return result
    except Exception as e:
        error_result = ProcessingError(error_message=str(e))
        return error_result

setup = RequestConsumerSetup(
    publisher_exchange_name=PUBLISHER_EXCHANGE_NAME,
    consumer_queue_name=CONSUMER_QUEUE_NAME
)

responses = {
    SceneChangesDetected: RESPONSE_MESSAGE_TYPE,
    ProcessingError: ERROR_MESSAGE_TYPE
}

detectScenesConsumer = BaseConsumer(
    setup,
    DetectSceneChangesMessage,
    responses,
    detect_scene_changes_handler
)



