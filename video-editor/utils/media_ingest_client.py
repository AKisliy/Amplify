from enum import StrEnum
import os
import logging

import requests

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv("MEDIA_INGEST_URL", "http://media-ingest:5070")

class MediaVariant(StrEnum):
    Tiny="Tiny"
    Medium="Medium"


def get_presigned_url(media_id: str) -> str:
    """Return a presigned download URL for the given media ID."""
    url = f"{_BASE_URL}/api/internal/media/{media_id}/link"
    response = requests.get(url, params={"linkType": "Presigned", "includeMetadata": "false"}, timeout=30)
    response.raise_for_status()
    return response.json()["link"]


def download_media(media_id: str, dest_path: str) -> None:
    """Download media via presigned URL and save to dest_path."""
    presigned_url = get_presigned_url(media_id)
    with requests.get(presigned_url, stream=True, timeout=300) as r:
        r.raise_for_status()
        with open(dest_path, "wb") as f:
            for chunk in r.iter_content(chunk_size=8192):
                f.write(chunk)
    logger.debug("Downloaded media %s to %s", media_id, dest_path)


def get_upload_presigned_url(media_id: str) -> str:
    """Return a presigned PUT URL to overwrite an existing media file."""
    url = f"{_BASE_URL}/api/internal/media/{media_id}/presigned-upload"
    response = requests.get(url, timeout=30)
    response.raise_for_status()
    return response.json()["uploadUrl"]

def overwrite_media(media_id: str, file_path: str, content_type: str = "video/mp4"):
    """Overwrites existing media file, preserving the correct Content-Type in GCS/S3."""
    url = get_upload_presigned_url(media_id)

    if not os.path.exists(file_path):
        raise FileNotFoundError(f"No file found: {file_path}")

    file_size = os.path.getsize(file_path)
    with open(file_path, "rb") as f:
        put_response = requests.put(
            url,
            data=f,
            headers={"Content-Type": content_type, "Content-Length": str(file_size)},
            timeout=300,
        )
    put_response.raise_for_status()

    logger.debug("File %s was overwritten", media_id)


def upload_media(
        file_path: str, 
        content_type: str = "video/mp4", 
        parent_media_id: str | None = None,
        variant: MediaVariant | None = None) -> str:
    """Register a new media record, get a presigned PUT URL, upload directly to S3, return media ID."""
    file_name = os.path.basename(file_path)
    file_size = os.path.getsize(file_path)

    body = {"fileName": file_name, "contentType": content_type, "fileSize": file_size}

    if parent_media_id:
        body["parentMediaId"] = parent_media_id
    if variant:
        body["variant"] = variant

    # 1. Register in media-ingest and get presigned PUT URL
    response = requests.post(
        f"{_BASE_URL}/api/internal/media/presigned-upload",
        json=body,
        timeout=30,
    )
    response.raise_for_status()
    data = response.json()
    media_id: str = data["mediaId"]
    upload_url: str = data["uploadUrl"]

    # 2. PUT file bytes directly to S3
    with open(file_path, "rb") as f:
        put_response = requests.put(
            upload_url,
            data=f,
            headers={"Content-Type": content_type, "Content-Length": str(file_size)},
            timeout=300,
        )
    put_response.raise_for_status()

    # 3. Confirm upload so media-ingest marks the record as Uploaded
    complete_response = requests.post(
        f"{_BASE_URL}/api/internal/media/{media_id}/upload-completed",
        timeout=30,
    )
    complete_response.raise_for_status()

    logger.debug("Uploaded %s → media ID %s", file_path, media_id)
    return media_id
