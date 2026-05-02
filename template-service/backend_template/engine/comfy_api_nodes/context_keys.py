"""
Shared execution context keys and utilities for extra_pnginfo enrichment.

All nodes that generate media or read generation metadata must use these
constants and helpers — no magic strings, no ad-hoc dict keys.

━━ Context maps in extra_pnginfo ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  extra_pnginfo[MEDIA_PROMPTS][media_id]   → str   (Veo prompt used)
  extra_pnginfo[MEDIA_GEN_PARAMS][media_id] → dict  (full gen params)

━━ Gen param dict keys (GenParamKey) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  {
    "media_id":         str,
    "prompt":           str,
    "model":            str,
    "aspect_ratio":     str,
    "duration":         int,
    "resolution":       str,
    "negative_prompt":  str,
    "first_frame_uuid": str | None,
    "last_frame_uuid":  str | None,
  }

━━ Usage pattern ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  # In a generation node:
  @classmethod
  @with_media_context
  async def execute(cls, ...) -> IO.NodeOutput:
      ...
      return MediaNodeOutput(
          video_uuids,
          context=[
              {
                  GenParamKey.MEDIA_ID:         media_id,
                  GenParamKey.PROMPT:           veo_prompt,
                  GenParamKey.MODEL:            veo_model,
                  GenParamKey.ASPECT_RATIO:     aspect_ratio,
                  GenParamKey.DURATION:         8,
                  GenParamKey.RESOLUTION:       "720p",
                  GenParamKey.NEGATIVE_PROMPT:  "",
                  GenParamKey.FIRST_FRAME_UUID: first_frame_uuid,
                  GenParamKey.LAST_FRAME_UUID:  None,
              }
              for media_id, veo_prompt in zip(video_uuids, veo_prompts_list)
          ],
          ui={"video_uuids": video_uuids},
      )
"""

from __future__ import annotations

import functools
import logging
from typing import Any

logger = logging.getLogger(__name__)

MEDIA_PROMPTS = "media_prompts"
MEDIA_GEN_PARAMS = "media_gen_params"


class GenParamKey:
    MEDIA_ID         = "media_id"
    PROMPT           = "prompt"
    MODEL            = "model"
    ASPECT_RATIO     = "aspect_ratio"
    DURATION         = "duration"
    RESOLUTION       = "resolution"
    NEGATIVE_PROMPT  = "negative_prompt"
    FIRST_FRAME_UUID = "first_frame_uuid"
    LAST_FRAME_UUID  = "last_frame_uuid"



def write_media_context(extra_pnginfo: dict, media_id: str, params: dict) -> None:
    """Write a single media entry into extra_pnginfo context maps."""
    prompt = params.get(GenParamKey.PROMPT, "")
    extra_pnginfo.setdefault(MEDIA_PROMPTS, {})[media_id] = prompt
    extra_pnginfo.setdefault(MEDIA_GEN_PARAMS, {})[media_id] = {
        k: v for k, v in params.items() if k != GenParamKey.MEDIA_ID
    }


# Import here to avoid circular issues with comfy internals
from comfy_api.latest._io import NodeOutput  


class MediaNodeOutput(NodeOutput):
    """NodeOutput subclass that carries a list of per-media context entries.

    Each entry is a dict with GenParamKey.* keys. The ``@with_media_context``
    decorator reads these entries and writes them to extra_pnginfo automatically.
    """

    def __init__(self, *args: Any, context: list[dict] | None = None, **kwargs: Any):
        super().__init__(*args, **kwargs)
        self.context: list[dict] = context or []

def with_media_context(execute_fn):
    """Classmethod decorator that auto-writes media context to extra_pnginfo.

    Wrap around the raw async ``execute`` function *before* ``@classmethod``:

        @classmethod
        @with_media_context
        async def execute(cls, ...) -> IO.NodeOutput:
            ...
            return MediaNodeOutput(..., context=[{GenParamKey.MEDIA_ID: ..., ...}])

    If the node returns a plain ``NodeOutput`` (no context), this is a no-op.
    """
    @functools.wraps(execute_fn)
    async def wrapper(cls, **kwargs):
        result = await execute_fn(cls, **kwargs)

        if not isinstance(result, MediaNodeOutput) or not result.context:
            return result

        extra_pnginfo = getattr(getattr(cls, "hidden", None), "extra_pnginfo", None)
        if extra_pnginfo is None:
            logger.warning(
                "[with_media_context] extra_pnginfo not available on %s — context not written",
                cls.__name__,
            )
            return result

        for entry in result.context:
            media_id = entry.get(GenParamKey.MEDIA_ID)
            if not media_id:
                logger.warning("[with_media_context] context entry missing media_id — skipped")
                continue
            write_media_context(extra_pnginfo, media_id, entry)
            logger.debug("[with_media_context] wrote context for media_id=%s", media_id)

        return result

    return wrapper
