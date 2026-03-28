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

def changeVoice(presigned_url: str, voice_id: str) -> str:
    """Change voice via ai-gateway and return new audio file."""
    response = requests.post(
        f"{_BASE_URL}/api/voiceover",
        json={"presignedUrl": presigned_url, "voiceId": voice_id},
        timeout=300,
    )
    response.raise_for_status()
    logger.info("Voiceover %s", response.json())
    return response.json()["presignedUrl"]