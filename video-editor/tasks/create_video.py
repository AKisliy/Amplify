import logging
import os

from kombu import Connection, Exchange, Producer

from celery_app import app
from factory.editor_factory import EditorFactory
from models.messages.base_create_video_message import BaseCreateVideoMessage
from models.messages.video_editing_step_changed import VideoEditingStepChanged, EditingStepStatus
from models.video_generated import VideoGenerated

logger = logging.getLogger(__name__)

PROGRESS_EXCHANGE_NAME = "video-editing-step-changed"
RESPONSE_EXCHANGE_NAME = "video-generated"


@app.task(
    bind=True,
    name="tasks.create_video",
    acks_late=True,
    reject_on_worker_lost=True,
    max_retries=3,
    soft_time_limit=1800,
)
def create_video(self, payload: dict) -> dict:
    saving_path = os.getenv("MEDIA_SAVING_PATH")
    if not saving_path:
        raise ValueError("MEDIA_SAVING_PATH variable is not specified")

    message = BaseCreateVideoMessage.model_validate(payload)
    broker_url = os.getenv("AMQP_URL", "amqp://guest:guest@localhost:5672//")

    try:
        factory = EditorFactory()
        editor = factory.get_editor(message.creation_args)

        progress_cb = _make_progress_callback(message, broker_url)
        output_path = editor.edit_video(
            message.creation_args,
            saving_path,
            video_id=message.video_id,
            progress_cb=progress_cb,
        )
    except Exception as exc:
        logger.error(f"Task failed for video {message.video_id}: {exc}")
        raise self.retry(exc=exc, countdown=30)

    result = VideoGenerated(
        video_id=message.video_id,
        status="Success",
        output_path=output_path,
        error="",
    )
    _publish(result.model_dump(by_alias=True), RESPONSE_EXCHANGE_NAME, broker_url)
    return result.model_dump(by_alias=True)


def _make_progress_callback(message: BaseCreateVideoMessage, broker_url: str):
    def callback(step: str, status: EditingStepStatus, error: str | None) -> None:
        event = VideoEditingStepChanged(
            video_id=message.video_id,
            node_id=message.node_id,
            user_id=message.user_id,
            step=step,
            status=status,
            error=error,
        )
        _publish(event.model_dump(by_alias=True), PROGRESS_EXCHANGE_NAME, broker_url)

    return callback


def _publish(body: dict, exchange_name: str, broker_url: str) -> None:
    try:
        exchange = Exchange(exchange_name, type="fanout", durable=True)
        with Connection(broker_url) as conn:
            with conn.Producer() as producer:
                producer.publish(body, exchange=exchange, declare=[exchange])
    except Exception as e:
        logger.warning(f"Failed to publish to {exchange_name}: {e}")
