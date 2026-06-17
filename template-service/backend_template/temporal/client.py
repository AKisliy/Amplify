"""Temporal client singleton."""
from __future__ import annotations

import asyncio
import logging
from temporalio.client import Client

from backend_template.config import settings

logger = logging.getLogger(__name__)

_client: Client | None = None
_lock = asyncio.Lock()


async def get_temporal_client() -> Client:
    global _client
    if _client is not None:
        return _client
    async with _lock:
        if _client is None:
            logger.info("Connecting to Temporal at %s", settings.temporal_host)
            _client = await Client.connect(settings.temporal_host)
    return _client
