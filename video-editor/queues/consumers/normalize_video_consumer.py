import logging
import os
import subprocess
import tempfile

from models.messages.normalize_video_command import NormalizeVideoCommand
from queues.consumers.raw_consumer import RawJsonConsumer
from utils.storage.minio_client import get_s3_client, get_presigned_url, upload_from_file

EXCHANGE_NAME = "video-normalize-requested"
QUEUE_NAME = "video-editor-normalize"


def _normalize(input_url: str, output_path: str):
    # Input is a presigned HTTP URL — ffmpeg streams it directly, no local download needed.
    # Output goes to a temp file because -movflags +faststart requires seekable output.
    cmd = [
        "ffmpeg", "-y",
        "-i", input_url,
        "-c:v", "libx264", "-crf", "23", "-preset", "fast",
        "-c:a", "aac", "-b:a", "128k",
        "-movflags", "+faststart",
        output_path,
    ]
    logging.info("Running ffmpeg normalize")
    subprocess.run(cmd, check=True, capture_output=True)


def normalizeHandler(message: NormalizeVideoCommand):
    bucket = os.getenv("MINIO_BUCKET", "media")
    client = get_s3_client()

    logging.info("Normalizing video — MediaId=%s FileKey=%s", message.media_id, message.file_key)

    input_url = get_presigned_url(client, bucket, message.file_key)
    output_tmp = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name

    try:
        _normalize(input_url, output_tmp)
        upload_from_file(client, bucket, message.file_key, output_tmp)
        logging.info("Normalized video uploaded back to '%s'", message.file_key)
    finally:
        try:
            os.remove(output_tmp)
        except OSError:
            pass


normalizeConsumer = RawJsonConsumer(
    exchange_name=EXCHANGE_NAME,
    queue_name=QUEUE_NAME,
    message_type=NormalizeVideoCommand,
    handler=normalizeHandler,
)
