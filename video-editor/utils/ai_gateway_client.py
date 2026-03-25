import os
import logging

import requests

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv("AI_GATEWAY_URL", "http://ai-gateway:5080")


def transcribe(presigned_url: str, language: str | None = None) -> str:
    """Transcribe audio/video via ai-gateway and return SRT text."""
    response = requests.post(
        f"{_BASE_URL}/api/transcribe",
        json={"presignedUrl": presigned_url, "language": language},
        timeout=300,
    )
    response.raise_for_status()
    logger.info("Transcription %s", response.json())
    return response.json()["srtText"]