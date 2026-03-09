import asyncio
import contextlib
import time
from collections.abc import Callable

from comfy.model_management import processing_interrupted
from comfy_api.latest import IO

from .common_exceptions import ProcessingInterrupted

def is_processing_interrupted() -> bool:
    """Return True if user/runtime requested interruption."""
    return processing_interrupted()


def get_node_id(node_cls: type[IO.ComfyNode]) -> str:
    return node_cls.hidden.unique_id

def get_auth_header(node_cls: type[IO.ComfyNode]) -> dict[str, str]:
    if node_cls.hidden.auth_token_comfy_org:
        return {"Authorization": f"Bearer {node_cls.hidden.auth_token_comfy_org}"}
    if node_cls.hidden.api_key_comfy_org:
        return {"X-API-KEY": node_cls.hidden.api_key_comfy_org}
    return {}


def default_base_url() -> str:
    return "https://api.comfy.org"


async def sleep_with_interrupt(
    seconds: float,
    node_cls: type[IO.ComfyNode] | None,
    label: str | None = None,
    start_ts: float | None = None,
    estimated_total: int | None = None,
    *,
    display_callback: Callable[[type[IO.ComfyNode], str, int, int | None], None] | None = None,
):
    """
    Sleep in 1s slices while:
      - Checking for interruption (raises ProcessingInterrupted).
      - Optionally emitting time progress via display_callback (if provided).
    """
    end = time.monotonic() + seconds
    while True:
        if is_processing_interrupted():
            raise ProcessingInterrupted("Task cancelled")
        now = time.monotonic()
        if start_ts is not None and label and display_callback:
            with contextlib.suppress(Exception):
                display_callback(node_cls, label, int(now - start_ts), estimated_total)
        if now >= end:
            break
        await asyncio.sleep(min(1.0, end - now))
