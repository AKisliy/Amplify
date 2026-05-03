import asyncio
import logging
import os

from kiota_abstractions.authentication.anonymous_authentication_provider import AnonymousAuthenticationProvider
from kiota_http.httpx_request_adapter import HttpxRequestAdapter

from clients.ai_gateway.ai_gateway_client import AiGatewayClient
from clients.ai_gateway.models.transcribe_request import TranscribeRequest
from clients.ai_gateway.models.voiceover_request import VoiceoverRequest

logger = logging.getLogger(__name__)

_BASE_URL = os.getenv("AI_GATEWAY_URL", "http://ai-gateway:5080")


def _make_client() -> AiGatewayClient:
    auth = AnonymousAuthenticationProvider()
    adapter = HttpxRequestAdapter(auth)
    adapter.base_url = _BASE_URL
    return AiGatewayClient(adapter)


def transcribe(
    presigned_url: str,
    language: str | None = None,
    max_words_per_segment: int | None = None,
    max_chars_per_segment: int | None = None,
) -> str:
    """Transcribe audio/video via ai-gateway and return SRT text."""
    async def _call() -> str:
        client = _make_client()
        body = TranscribeRequest(
            presigned_url=presigned_url,
            language=language,
            max_words_per_segment=max_words_per_segment,
            max_chars_per_segment=max_chars_per_segment,
        )
        result = await client.api.transcribe.post(body)
        logger.info("Transcription result srt length: %d", len(result.srt_text or ""))
        return result.srt_text

    return asyncio.run(_call())


def changeVoice(presigned_url: str, voice_id: str) -> str:
    """Change voice via ai-gateway and return presigned URL to the new audio."""
    async def _call() -> str:
        client = _make_client()
        body = VoiceoverRequest(presigned_url=presigned_url, voice_id=voice_id)
        result = await client.api.voiceover.post(body)
        logger.info("Voiceover result presigned url: %s", result.presigned_url)
        return result.presigned_url

    return asyncio.run(_call())
