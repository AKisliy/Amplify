import logging
import os
import subprocess
import tempfile

from celery_app import app
from models.messages.media_processing_completed import MediaProcessingCompleted
from utils.broker.publisher import publish_message
from utils.media_ingest_client import MediaVariant, get_presigned_url, overwrite_media, upload_media

IMAGE_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
VIDEO_CONTENT_TYPES = {"video/mp4", "video/webm"}

THUMB_TINY_WIDTH = 16
THUMB_MEDIUM_WIDTH = 400
COMPLETED_EXCHANGE = "media-processing-completed"



def _generate_thumbnail(input_url: str, output_path: str, width: int, is_video: bool):
    scale_filter = f"scale={width}:-1"
    cmd = ["ffmpeg", "-y", "-i", input_url]
    if is_video:
        cmd += ["-vframes", "1"]
    cmd += ["-vf", scale_filter, output_path]
    subprocess.run(cmd, check=True, capture_output=True)


def _normalize_video(input_url: str, output_path: str):
    cmd = [
        "ffmpeg", "-y",
        "-i", input_url,
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]
    subprocess.run(cmd, check=True, capture_output=True)


def _publish_result(result: MediaProcessingCompleted):
    publish_message(COMPLETED_EXCHANGE, result.model_dump(by_alias=True))


@app.task(name="tasks.process_media", bind=True, max_retries=3, default_retry_delay=30)
def process_media(self, media_id: str, file_key: str, content_type: str):
    is_video = content_type in VIDEO_CONTENT_TYPES

    logging.info("Processing media — MediaId=%s FileKey=%s ContentType=%s", media_id, file_key, content_type)

    try:
        input_url = get_presigned_url(media_id)

        with tempfile.TemporaryDirectory() as tmp:
            tiny_path = os.path.join(tmp, "tiny.webp")
            medium_path = os.path.join(tmp, "medium.webp")

            _generate_thumbnail(input_url, tiny_path, THUMB_TINY_WIDTH, is_video)
            upload_media(tiny_path, content_type="image/webp", parent_media_id=media_id, variant=MediaVariant.Tiny)
            logging.info("Uploaded tiny thumbnail for MediaId=%s", media_id)

            _generate_thumbnail(input_url, medium_path, THUMB_MEDIUM_WIDTH, is_video)
            upload_media(medium_path, content_type="image/webp", parent_media_id=media_id, variant=MediaVariant.Medium)
            logging.info("Uploaded medium thumbnail for MediaId=%s", media_id)

            if is_video:
                normalized_path = os.path.join(tmp, "normalized.mp4")
                _normalize_video(input_url, normalized_path)
                overwrite_media(media_id=media_id, file_path=normalized_path)
                logging.info("Uploaded normalized video → %s", file_key)

        _publish_result(MediaProcessingCompleted(
            media_id=media_id,
            success=True,
            error=None
        ))
        logging.info("Media processing complete for MediaId=%s", media_id)

    except Exception as exc:
        logging.error("Media processing failed for MediaId=%s: %s", media_id, exc)

        if self.request.retries >= self.max_retries:
            _publish_result(MediaProcessingCompleted(
                media_id=media_id,
                success=False,
                error=str(exc),
            ))

        raise self.retry(exc=exc)
