"""
veo_regen.py — Standalone Veo regeneration client for the FastAPI Gateway.

Called from ManualReviewService.regenerate_shot() as a FastAPI BackgroundTask.
Uses plain aiohttp (no ComfyUI sync_op/poll_op wrappers) because it runs
outside the engine execution context — no node class available for progress
reporting.

Temporary Veo API client for shot regeneration during HITL review.

This module duplicates a subset of Veo3FirstLastFrameNode's generation logic
for use in FastAPI BackgroundTasks. It exists because the single-worker engine
cannot process mini-prompts while a graph is blocked on HITL polling.

TODO: Delete this module when multi-worker setup is deployed. Replace with
mini-prompt delegation — submit a single-node Veo3FirstLastFrameNode graph
to the engine queue and consume the result.
"""


from __future__ import annotations

import asyncio
import logging

import aiohttp

from config import gemini_config, media_ingest_config

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────────────

GEMINI_BASE_ENDPOINT = (
    f"https://aiplatform.googleapis.com/v1/projects/{gemini_config.project_id}"
    f"/locations/{gemini_config.location}/publishers/google/models"
)

# Canonical model aliases → full resource names (mirrors nodes_veo2.py MODELS_MAP)
MODELS_MAP: dict[str, str] = {
    "veo-3.1-generate":          "veo-3.1-generate-001",
    "veo-3.1-fast-generate":     "veo-3.1-fast-generate-001",
    "veo-3.1-lite-generate-001": "veo-3.1-lite-generate-001",
    "veo-3.0-generate-001":      "veo-3.0-generate-001",
    "veo-3.0-fast-generate-001": "veo-3.0-fast-generate-001",
}

_POLL_INTERVAL_SECONDS = 5.0
_MAX_POLL_ATTEMPTS = 96        # 96 × 5 s = 8 minutes max


# ── Internal helpers ──────────────────────────────────────────────────────────


def _get_token() -> str:
    """Return a valid Vertex AI access token (refreshed if needed)."""
    # Import here to avoid module-level side-effects during engine boot
    from comfy_api_nodes.util.request_utils import get_vertex_ai_access_token
    return get_vertex_ai_access_token()


async def _fetch_gcs_uri(media_id: str) -> str:
    """Resolve a MediaIngest UUID to its GCS URI (linkType=0 = GCS)."""
    url = f"{media_ingest_config.media_ingest_url}/internal/media/{media_id}/link"
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params={"linkType": 0}) as resp:
            data = await resp.json()
            link: str | None = data.get("link")
            if not link:
                raise ValueError(
                    f"MediaIngest returned no link for media_id={media_id!r}. "
                    f"Response: {data}"
                )
            return link


async def _register_gcs_uri(gcs_uri: str, content_type: str = "video/mp4") -> str:
    """Register a GCS URI with MediaIngest and return the new media UUID."""
    url = f"{media_ingest_config.media_ingest_url}/internal/media/import-gs"
    payload = {"files": [{"gsUri": gcs_uri, "contentType": content_type}]}
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json=payload) as resp:
            data = await resp.json()
            ids: list[str] = data.get("importedMediaIds", [])
            if not ids:
                raise ValueError(
                    f"MediaIngest returned no importedMediaIds. Response: {data}"
                )
            return ids[0]


# ── Public API ────────────────────────────────────────────────────────────────


async def regenerate_veo_shot(
    *,
    prompt: str,
    negative_prompt: str = "",
    resolution: str = "720p",
    aspect_ratio: str = "16:9",
    duration: int = 8,
    model: str = "veo-3.1-lite-generate-001",
    first_frame_uuid: str | None = None,
    last_frame_uuid: str | None = None,
) -> str:
    """Re-generate a single Veo shot and return the new MediaIngest UUID.

    Safe to call from a FastAPI BackgroundTask. Implements the same
    submit-then-poll pattern as ``Veo3FirstLastFrameNode._run_veo_generation``
    but without ComfyUI progress-reporting hooks.

    Parameters
    ----------
    prompt:
        Compiled Veo prompt text (possibly edited by the user).
    negative_prompt:
        Negative prompt guidance.
    resolution:
        Output resolution — ``"720p"`` or ``"1080p"``.
    aspect_ratio:
        ``"16:9"`` or ``"9:16"``.
    duration:
        Duration in seconds: 4, 6, or 8.
    model:
        Alias key resolved via MODELS_MAP (e.g. ``"veo-3.1-lite-generate-001"``).
    first_frame_uuid:
        MediaIngest UUID of the first-frame image (locked, from task payload).
    last_frame_uuid:
        MediaIngest UUID of the last-frame image (locked, from task payload).

    Returns
    -------
    str
        New MediaIngest media_id for the generated video.

    Raises
    ------
    Exception
        On Veo API errors, RAI filtering, or timeout.
    """
    resolved_model = MODELS_MAP.get(model, model)
    logger.info(
        "[veo_regen] Starting re-generation: model=%s duration=%ds aspect=%s",
        resolved_model, duration, aspect_ratio,
    )

    # ── 1. Resolve conditioned frame URIs ─────────────────────────────────────
    first_frame_uri: str | None = None
    last_frame_uri: str | None = None

    if first_frame_uuid:
        first_frame_uri = await _fetch_gcs_uri(first_frame_uuid)
        logger.debug("[veo_regen] first_frame_uri=%s", first_frame_uri)

    if last_frame_uuid:
        last_frame_uri = await _fetch_gcs_uri(last_frame_uuid)
        logger.debug("[veo_regen] last_frame_uri=%s", last_frame_uri)

    # ── 2. Build Veo request payload ──────────────────────────────────────────
    instance: dict = {"prompt": prompt}
    if first_frame_uri:
        instance["image"] = {"gcsUri": first_frame_uri, "mimeType": "image/png"}
    if last_frame_uri:
        instance["lastFrame"] = {"gcsUri": last_frame_uri, "mimeType": "image/png"}

    parameters: dict = {
        "aspectRatio":     aspect_ratio,
        "personGeneration": "ALLOW",
        "durationSeconds": duration,
        "enhancePrompt":   True,
        "storageUri":      gemini_config.storage_uri,
        "resolution":      resolution,
    }
    if negative_prompt:
        parameters["negativePrompt"] = negative_prompt

    # ── 3. Submit long-running generation ─────────────────────────────────────
    submit_url = f"{GEMINI_BASE_ENDPOINT}/{resolved_model}:predictLongRunning"
    token = _get_token()

    async with aiohttp.ClientSession() as session:
        async with session.post(
            submit_url,
            json={"instances": [instance], "parameters": parameters},
            headers={
                "Authorization":  f"Bearer {token}",
                "Content-Type":   "application/json",
            },
        ) as resp:
            init_data = await resp.json()
            if resp.status >= 400:
                raise Exception(
                    f"Veo submit failed (HTTP {resp.status}): {init_data}"
                )
            operation_name: str = init_data.get("name", "")
            if not operation_name:
                raise Exception(
                    f"Veo returned no operation name in submit response: {init_data}"
                )

    logger.info("[veo_regen] Long-running operation submitted: %s", operation_name)

    # ── 4. Poll until done ────────────────────────────────────────────────────
    poll_url = f"{GEMINI_BASE_ENDPOINT}/{resolved_model}:fetchPredictOperation"

    for attempt in range(1, _MAX_POLL_ATTEMPTS + 1):
        await asyncio.sleep(_POLL_INTERVAL_SECONDS)

        token = _get_token()  # refresh on each poll to avoid token expiry
        async with aiohttp.ClientSession() as session:
            async with session.post(
                poll_url,
                json={"operationName": operation_name},
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type":  "application/json",
                },
            ) as resp:
                poll_data = await resp.json()
                if resp.status >= 400:
                    raise Exception(
                        f"Veo poll failed (HTTP {resp.status}): {poll_data}"
                    )

        if poll_data.get("error"):
            err = poll_data["error"]
            raise Exception(
                f"Veo error: {err.get('message', 'unknown')} "
                f"(gRPC code={err.get('code')})"
            )

        if not poll_data.get("done", False):
            logger.debug("[veo_regen] Attempt %d/%d: operation not done yet", attempt, _MAX_POLL_ATTEMPTS)
            continue

        # Done — check RAI filter
        response = poll_data.get("response", {})
        if response.get("raiMediaFilteredCount", 0) > 0:
            reasons = response.get("raiMediaFilteredReasons", [])
            raise Exception(f"Veo RAI policy blocked the video. Reasons: {reasons}")

        # Extract GCS URI and register with MediaIngest
        videos: list[dict] = response.get("videos", [])
        if videos and videos[0].get("gcsUri"):
            gcs_uri = videos[0]["gcsUri"]
            logger.info("[veo_regen] Video ready at %s — registering with MediaIngest", gcs_uri)
            new_uuid = await _register_gcs_uri(gcs_uri, "video/mp4")
            logger.info("[veo_regen] Registered new media_id=%s", new_uuid)
            return new_uuid

        raise Exception(
            "Veo reported done=true but returned no video URIs. "
            f"Response: {response}"
        )

    raise Exception(
        f"Veo regeneration timed out after "
        f"{_MAX_POLL_ATTEMPTS * _POLL_INTERVAL_SECONDS:.0f}s "
        f"({_MAX_POLL_ATTEMPTS} poll attempts)."
    )
