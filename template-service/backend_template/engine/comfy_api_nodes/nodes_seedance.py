import asyncio
import logging
import math
from datetime import datetime, timedelta, timezone

from temporalio.common import RetryPolicy

from comfy_api.latest import IO, ComfyExtension
from comfy_api.latest._io import Hidden
from typing_extensions import override

import aiohttp

from comfy_api_nodes.apis.bytedance import (
    LegacyImage2VideoTaskCreationRequest,
    Seedance2TaskCreationRequest,
    SEEDANCE2_MODELS,
    SEEDANCE_TOKEN_UNIT_PRICES,
    TaskCreationResponse,
    TaskImageContent,
    TaskImageContentUrl,
    TaskStatusResponse,
    TaskTextContent,
    Text2VideoTaskCreationRequest,
    VIDEO_TASKS_EXECUTION_TIME,
)
from comfy_api_nodes.util.client import _litellm_context
from comfy_api_nodes.util import (
    ApiEndpoint,
    fetch_media_uri_from_ingest,
    upload_url_via_presigned,
    poll_op,
    sync_op,
    validate_string,
)
from comfy_api_nodes.context_keys import GenParamKey, MediaNodeOutput, with_media_context

from config import bytedance_config, litellm_config

logger = logging.getLogger(__name__)

# ByteDance Ark API — called directly (no internal proxy).
# BytePlus international accounts: ark.ap-southeast.bytepluses.com
# Volcengine China accounts:        ark.cn-beijing.volces.com
# Note: PowerShell/WinHTTP may hang on BytePlus due to TLS quirks on Windows;
#       Python aiohttp connects successfully.
_ARK_BASE_URL = "https://ark.ap-southeast.bytepluses.com/api/v3"
_TASK_ENDPOINT = f"{_ARK_BASE_URL}/contents/generations/tasks"

# Legacy Seedance 1.5 Pro model — kept for backward compatibility.
_LEGACY_MODEL_ID = "seedance-1-5-pro-251215"
_LEGACY_MODEL_DISPLAY = "Seedance 1.5 Pro (legacy)"
# Resolutions supported by the legacy model (inline-flag API).
_LEGACY_RESOLUTIONS = ["480p", "720p", "1080p"]

# Supported output resolutions for Seedance 2.0 models.
_SEEDANCE2_RESOLUTIONS = ["480p", "720p", "1080p", "4k"]
_SEEDANCE2_FAST_MINI_RESOLUTIONS = ["480p", "720p"]

# Supported aspect ratios (text-to-video).
_ASPECT_RATIOS = ["16:9", "4:3", "1:1", "3:4", "9:16", "21:9"]
# Aspect ratios for first-last-frame: adds 'adaptive' which derives ratio from the input frame.
_ASPECT_RATIOS_FLF = ["adaptive"] + _ASPECT_RATIOS


def _ark_auth_headers() -> dict:
    return {"Authorization": f"Bearer {bytedance_config.ark_api_key}"}


async def _log_spend_to_litellm(model_id: str, completion_tokens: int) -> None:
    """Post a spend entry to LiteLLM after a successful Seedance generation.

    Cost = completion_tokens × token unit price from SEEDANCE_TOKEN_UNIT_PRICES.
    Failures are logged as warnings and never interrupt node execution.
    """
    cost_per_token = SEEDANCE_TOKEN_UNIT_PRICES.get(model_id)
    if cost_per_token is None:
        logger.warning(
            "Seedance: no token unit price for '%s'. "
            "Set SEEDANCE_TOKEN_UNIT_PRICES[model_id] in apis/bytedance.py.",
            model_id,
        )
        return

    now = datetime.now(tz=timezone.utc).isoformat()
    payload: dict = {
        "call_type": "pass_through_endpoint",
        "model": model_id,
        "spend": completion_tokens * cost_per_token,
        "completion_tokens": completion_tokens,
        "total_tokens": completion_tokens,
        "prompt_tokens": 0,
        "startTime": now,
        "endTime": now,
        "api_base": _TASK_ENDPOINT,
        "metadata": {"spend_logs_metadata": _litellm_context.get()},
    }
    headers = {
        "x-litellm-api-key": f"Bearer {litellm_config.litellm_api_key}",
        "Content-Type": "application/json",
    }
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{litellm_config.litellm_base_url}/spend/logs",
                json=payload,
                headers=headers,
                timeout=aiohttp.ClientTimeout(total=10.0),
            ) as resp:
                if resp.status >= 400:
                    logger.warning(
                        "Seedance: LiteLLM spend log failed (HTTP %d): %s",
                        resp.status, await resp.text(),
                    )
    except Exception as exc:
        logger.warning("Seedance: failed to log spend to LiteLLM: %s", exc)


def _raise_if_text_params(prompt: str, text_params: list[str]) -> None:
    """Guard against users embedding raw CLI flags (e.g. --resolution) in the prompt.

    These must be set via the dedicated widget inputs, not inline in the prompt text,
    because the node appends them programmatically to avoid conflicts.
    """
    for param in text_params:
        if f"--{param} " in prompt:
            raise ValueError(
                f"--{param} is not allowed in the prompt. "
                f"Use the dedicated widget input to set this value."
            )


def _seedance2_resolutions_for(model_display_name: str) -> list[str]:
    """Return supported resolution options for the given Seedance 2 display model name."""
    if "Fast" in model_display_name or "Mini" in model_display_name:
        return _SEEDANCE2_FAST_MINI_RESOLUTIONS
    return _SEEDANCE2_RESOLUTIONS


class SeedanceTextToVideoNode(IO.ComfyNode):
    """
    Generates videos from text prompts using ByteDance's Seedance models.

    Supports four model options:
    - Seedance 2.0            — maximum quality (480p / 720p / 1080p / 4k)
    - Seedance 2.0 Fast       — balanced speed/quality (480p / 720p)
    - Seedance 2.0 Mini       — fastest, lowest-cost (480p / 720p)
    - Seedance 1.5 Pro (legacy) — previous generation; inline-flag API (480p / 720p / 1080p)

    Calls the ByteDance Ark API directly, polls for completion, and registers
    the resulting video with the Media Ingest service, returning a UUID that
    downstream nodes can reference.
    """

    temporal_policy = {
        "start_to_close_timeout": timedelta(minutes=90),
        "retry_policy": RetryPolicy(maximum_attempts=2),
    }

    @classmethod
    def define_schema(cls):
        # All model display names: Seedance 2.x tiers + legacy 1.5 Pro.
        _all_models = list(SEEDANCE2_MODELS.keys()) + [_LEGACY_MODEL_DISPLAY]
        # Full resolution union so every model's options are present in the combo.
        _all_resolutions = ["480p", "720p", "1080p", "4k"]
        return IO.Schema(
            node_id="SeedanceTextToVideoNode",
            display_name="Seedance Text to Video",
            category="api node/video/Seedance",
            description=(
                "Generates videos from text prompts using ByteDance's Seedance models "
                "(Seedance 2.0 / Fast / Mini, or legacy Seedance 1.5 Pro)."
            ),
            is_output_node=True,
            hidden=[Hidden.extra_pnginfo],
            inputs=[
                IO.Combo.Input(
                    "model",
                    options=_all_models,
                    default="Seedance 2.0",
                    tooltip=(
                        "Seedance 2.0 for maximum quality (480p–4k); "
                        "Fast / Mini for faster, lower-cost generation (480p–720p); "
                        "Seedance 1.5 Pro (legacy) for testing the previous-generation model (480p–1080p)."
                    ),
                ),
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    tooltip="Text description of the video to generate.",
                ),
                IO.Combo.Input(
                    "resolution",
                    options=_all_resolutions,
                    default="720p",
                    tooltip=(
                        "Output video resolution. "
                        "Available options depend on the selected model — "
                        "invalid combinations are caught at runtime."
                    ),
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=_ASPECT_RATIOS,
                    default="16:9",
                    tooltip="Output video aspect ratio.",
                ),
                IO.Int.Input(
                    "duration",
                    default=7,
                    min=4,
                    max=15,
                    step=1,
                    display_mode=IO.NumberDisplay.slider,
                    tooltip=(
                        "Duration of the output video in seconds (4–15). "
                        "Seedance 1.5 Pro supports 4–12 s."
                    ),
                ),
                IO.Boolean.Input(
                    "generate_audio",
                    default=True,
                    tooltip="Enable audio generation for the output video.",
                ),
                IO.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=2147483647,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    control_after_generate=True,
                    tooltip="Seed controls re-runs; results are non-deterministic regardless of seed.",
                    optional=True,
                ),
                IO.Boolean.Input(
                    "watermark",
                    default=False,
                    tooltip='Add an "AI generated" watermark to the video.',
                    optional=True,
                    advanced=True,
                ),
            ],
            outputs=[
                IO.String.Output(display_name="video_uuid"),
            ],
        )

    @classmethod
    @with_media_context
    async def execute(
        cls,
        model: str = "Seedance 2.0",
        prompt: str = "",
        resolution: str = "720p",
        aspect_ratio: str = "16:9",
        duration: int = 7,
        generate_audio: bool = True,
        seed: int = 0,
        watermark: bool = False,
    ):
        validate_string(prompt, strip_whitespace=True, min_length=1)

        is_legacy = model == _LEGACY_MODEL_DISPLAY

        if is_legacy:
            model_id = _LEGACY_MODEL_ID
            # Legacy model uses the inline-flag API and has tighter constraints.
            if resolution not in _LEGACY_RESOLUTIONS:
                raise ValueError(
                    f"Resolution '{resolution}' is not supported by {model}. "
                    f"Supported: {', '.join(_LEGACY_RESOLUTIONS)}."
                )
            if duration < 4 or duration > 12:
                raise ValueError(
                    f"Seedance 1.5 Pro requires a duration of 4–12 s, got {duration}."
                )
            _raise_if_text_params(
                prompt,
                ["resolution", "ratio", "duration", "seed", "camerafixed", "watermark"],
            )
        else:
            model_id = SEEDANCE2_MODELS[model]
            # Validate resolution availability for Fast/Mini tiers.
            allowed_resolutions = _seedance2_resolutions_for(model)
            if resolution not in allowed_resolutions:
                raise ValueError(
                    f"Resolution '{resolution}' is not supported by {model}. "
                    f"Supported: {', '.join(allowed_resolutions)}."
                )

        # Estimate wall-clock time for this request so poll_op can display progress.
        exec_times = VIDEO_TASKS_EXECUTION_TIME.get(model_id, {})
        base_seconds = exec_times.get(resolution, 120)
        estimated_duration = max(1, math.ceil(base_seconds * (duration / 10.0)))

        # --- Step 1: Submit the generation task ---
        if is_legacy:
            # Legacy path: all parameters are embedded as CLI flags in the prompt text.
            full_prompt = (
                f"{prompt} "
                f"--resolution {resolution} "
                f"--ratio {aspect_ratio} "
                f"--duration {duration} "
                f"--seed {seed} "
                f"--watermark {str(watermark).lower()}"
            )
            task_data = Text2VideoTaskCreationRequest(
                model=model_id,
                content=[TaskTextContent(text=full_prompt)],
                generate_audio=generate_audio,
            )
        else:
            # Seedance 2.x path: dedicated JSON fields for each parameter.
            task_data = Seedance2TaskCreationRequest(
                model=model_id,
                content=[TaskTextContent(text=prompt)],
                generate_audio=generate_audio,
                resolution=resolution,
                ratio=aspect_ratio,
                duration=duration,
                seed=seed,
                watermark=watermark,
            )

        initial_response = await sync_op(
            cls,
            ApiEndpoint(
                path=_TASK_ENDPOINT,
                method="POST",
                headers=_ark_auth_headers(),
            ),
            response_model=TaskCreationResponse,
            data=task_data,
            wait_label="Submitting task to Seedance API...",
        )

        # --- Step 2: Poll until the task reaches a terminal state ---
        poll_response = await poll_op(
            cls,
            ApiEndpoint(
                path=f"{_TASK_ENDPOINT}/{initial_response.id}",
                method="GET",
                headers=_ark_auth_headers(),
            ),
            response_model=TaskStatusResponse,
            status_extractor=lambda r: r.status,
            completed_statuses=["succeeded"],
            failed_statuses=["failed", "cancelled"],
            poll_interval=9.0,
            estimated_duration=estimated_duration,
        )

        if poll_response.error:
            raise Exception(
                f"Seedance task failed. "
                f"Code: {poll_response.error.code}, "
                f"Message: {poll_response.error.message}"
            )

        if poll_response.usage and poll_response.usage.completion_tokens:
            await _log_spend_to_litellm(model_id, poll_response.usage.completion_tokens)

        if not poll_response.content or not poll_response.content.video_url:
            raise Exception("Seedance task succeeded but returned no video URL.")

        # --- Step 3: Register the video with Media Ingest and return its UUID ---
        media_id = await upload_url_via_presigned(cls, poll_response.content.video_url)

        return MediaNodeOutput(
            media_id,
            context=[{
                GenParamKey.MEDIA_ID:         media_id,
                GenParamKey.PROMPT:           prompt,
                GenParamKey.MODEL:            model_id,
                GenParamKey.ASPECT_RATIO:     aspect_ratio,
                GenParamKey.DURATION:         duration,
                GenParamKey.RESOLUTION:       resolution,
                GenParamKey.NEGATIVE_PROMPT:  "",
                GenParamKey.FIRST_FRAME_UUID: None,
                GenParamKey.LAST_FRAME_UUID:  None,
            }],
            ui={"video_uuid": [media_id]},
        )


class SeedanceFirstLastFrameNode(IO.ComfyNode):
    """
    Generates video from a text prompt plus first and/or last frame images using
    ByteDance's Seedance models.

    Supports four model options:
    - Seedance 2.0            — maximum quality (480p / 720p / 1080p / 4k)
    - Seedance 2.0 Fast       — balanced speed/quality (480p / 720p)
    - Seedance 2.0 Mini       — fastest, lowest-cost (480p / 720p)
    - Seedance 1.5 Pro (legacy) — previous generation; inline-flag API (480p / 720p / 1080p)

    Inputs accept Media Ingest UUIDs (strings) for the frame images — no raw
    tensors are used; the engine resolves each UUID to a GCS URI before calling
    the Ark API.

    At least one of first_frame_uuid or last_frame_uuid must be provided.
    """

    temporal_policy = {
        "start_to_close_timeout": timedelta(minutes=90),
        "retry_policy": RetryPolicy(maximum_attempts=2),
    }

    @classmethod
    def define_schema(cls):
        _all_models = list(SEEDANCE2_MODELS.keys()) + [_LEGACY_MODEL_DISPLAY]
        _all_resolutions = ["480p", "720p", "1080p", "4k"]
        return IO.Schema(
            node_id="SeedanceFirstLastFrameNode",
            display_name="Seedance First-Last-Frame to Video",
            category="api node/video/Seedance",
            description=(
                "Generate video using Seedance models from a first frame image and optional "
                "last frame image. Supports Seedance 2.0 / Fast / Mini and legacy Seedance 1.5 Pro. "
                "Accepts Media Ingest UUIDs for both frames."
            ),
            is_output_node=True,
            hidden=[Hidden.extra_pnginfo],
            inputs=[
                IO.Combo.Input(
                    "model",
                    options=_all_models,
                    default="Seedance 2.0",
                    tooltip=(
                        "Seedance 2.0 for maximum quality; Fast for speed optimisation; "
                        "Mini for the fastest, lowest-cost generation; "
                        "Seedance 1.5 Pro (legacy) for testing the previous-generation model."
                    ),
                ),
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    tooltip="Text description of the video to generate.",
                ),
                IO.String.Input(
                    "first_frame_uuid",
                    force_input=True,
                    optional=True,
                    tooltip=(
                        "Media Ingest UUID of the first-frame image. "
                        "At least one of first_frame_uuid or last_frame_uuid is required."
                    ),
                ),
                IO.String.Input(
                    "last_frame_uuid",
                    force_input=True,
                    optional=True,
                    tooltip=(
                        "Media Ingest UUID of the last-frame image. "
                        "Optional — omit to generate freely toward the end of the video."
                    ),
                ),
                IO.Combo.Input(
                    "resolution",
                    options=_all_resolutions,
                    default="720p",
                    tooltip=(
                        "Output video resolution. "
                        "1080p/4k available on Seedance 2.0 only; "
                        "Seedance 1.5 Pro supports up to 1080p. "
                        "Invalid combinations are caught at runtime."
                    ),
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=_ASPECT_RATIOS_FLF,
                    default="adaptive",
                    tooltip=(
                        "Aspect ratio of the output video. "
                        "'adaptive' derives the ratio from the first-frame image."
                    ),
                ),
                IO.Int.Input(
                    "duration",
                    default=7,
                    min=4,
                    max=15,
                    step=1,
                    display_mode=IO.NumberDisplay.slider,
                    tooltip="Duration of the output video in seconds (4–15).",
                ),
                IO.Boolean.Input(
                    "generate_audio",
                    default=True,
                    tooltip="Enable audio generation for the output video.",
                ),
                IO.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=2147483647,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    control_after_generate=True,
                    tooltip="Seed controls re-runs; results are non-deterministic regardless of seed.",
                    optional=True,
                ),
                IO.Boolean.Input(
                    "watermark",
                    default=False,
                    tooltip='Add an "AI generated" watermark to the video.',
                    optional=True,
                    advanced=True,
                ),
            ],
            outputs=[
                IO.String.Output(display_name="video_uuid"),
            ],
        )

    @classmethod
    @with_media_context
    async def execute(
        cls,
        model: str = "Seedance 2.0",
        prompt: str = "",
        first_frame_uuid: str | None = None,
        last_frame_uuid: str | None = None,
        resolution: str = "720p",
        aspect_ratio: str = "adaptive",
        duration: int = 7,
        generate_audio: bool = True,
        seed: int = 0,
        watermark: bool = False,
    ):
        validate_string(prompt, strip_whitespace=True, min_length=1)

        if not first_frame_uuid and not last_frame_uuid:
            raise ValueError(
                "At least one of first_frame_uuid or last_frame_uuid must be provided."
            )

        is_legacy = model == _LEGACY_MODEL_DISPLAY

        if is_legacy:
            model_id = _LEGACY_MODEL_ID
            if resolution not in _LEGACY_RESOLUTIONS:
                raise ValueError(
                    f"Resolution '{resolution}' is not supported by {model}. "
                    f"Supported: {', '.join(_LEGACY_RESOLUTIONS)}."
                )
            if duration < 4 or duration > 12:
                raise ValueError(
                    f"Seedance 1.5 Pro requires a duration of 4–12 s, got {duration}."
                )
            _raise_if_text_params(
                prompt,
                ["resolution", "ratio", "duration", "seed", "camerafixed", "watermark"],
            )
        else:
            model_id = SEEDANCE2_MODELS[model]
            # Validate resolution availability for Fast/Mini tiers.
            allowed_resolutions = _seedance2_resolutions_for(model)
            if resolution not in allowed_resolutions:
                raise ValueError(
                    f"Resolution '{resolution}' is not supported by {model}. "
                    f"Supported: {', '.join(allowed_resolutions)}."
                )

        # Resolve frame UUIDs to public URLs in parallel (same for both paths).
        first_frame_task = (
            asyncio.create_task(fetch_media_uri_from_ingest(cls, first_frame_uuid, link_type="Public"))
            if first_frame_uuid else None
        )
        last_frame_task = (
            asyncio.create_task(fetch_media_uri_from_ingest(cls, last_frame_uuid, link_type="Public"))
            if last_frame_uuid else None
        )
        first_frame_url = await first_frame_task if first_frame_task else None
        last_frame_url = await last_frame_task if last_frame_task else None

        # Build the content list.
        # Legacy: inline flags embedded in text; images appended as TaskImageContent.
        # Seedance 2.x: plain text prompt; parameters as top-level JSON fields.
        if is_legacy:
            # 'adaptive' aspect ratio → omit --ratio flag (model infers from first frame).
            ratio_flag = f" --ratio {aspect_ratio}" if aspect_ratio != "adaptive" else ""
            full_prompt = (
                f"{prompt}"
                f" --resolution {resolution}"
                f"{ratio_flag}"
                f" --duration {duration}"
                f" --seed {seed}"
                f" --watermark {str(watermark).lower()}"
            )
            content: list[TaskTextContent | TaskImageContent] = [
                TaskTextContent(text=full_prompt),
            ]
        else:
            content = [
                TaskTextContent(text=prompt),
            ]

        if first_frame_url:
            content.append(
                TaskImageContent(
                    image_url=TaskImageContentUrl(url=first_frame_url),
                    role="first_frame",
                )
            )
        if last_frame_url:
            content.append(
                TaskImageContent(
                    image_url=TaskImageContentUrl(url=last_frame_url),
                    role="last_frame",
                )
            )

        # Estimate wall-clock time for progress reporting.
        exec_times = VIDEO_TASKS_EXECUTION_TIME.get(model_id, {})
        base_seconds = exec_times.get(resolution, 120)
        estimated_duration = max(1, math.ceil(base_seconds * (duration / 10.0)))

        # --- Step 1: Submit the generation task ---
        if is_legacy:
            task_data = LegacyImage2VideoTaskCreationRequest(
                model=model_id,
                content=content,
                generate_audio=generate_audio,
            )
        else:
            task_data = Seedance2TaskCreationRequest(
                model=model_id,
                content=content,
                generate_audio=generate_audio,
                resolution=resolution,
                ratio=aspect_ratio,
                duration=duration,
                seed=seed,
                watermark=watermark,
            )

        initial_response = await sync_op(
            cls,
            ApiEndpoint(
                path=_TASK_ENDPOINT,
                method="POST",
                headers=_ark_auth_headers(),
            ),
            response_model=TaskCreationResponse,
            data=task_data,
            wait_label="Submitting First-Last-Frame task to Seedance API...",
        )

        logging.info(f"task_id: https://seedance.alexeykiselev.tech/task_management/{initial_response.id}")

        # --- Step 2: Poll until the task reaches a terminal state ---
        poll_response = await poll_op(
            cls,
            ApiEndpoint(
                path=f"{_TASK_ENDPOINT}/{initial_response.id}",
                method="GET",
                headers=_ark_auth_headers(),
            ),
            response_model=TaskStatusResponse,
            status_extractor=lambda r: r.status,
            completed_statuses=["succeeded"],
            failed_statuses=["failed", "cancelled"],
            poll_interval=9.0,
            estimated_duration=estimated_duration,
        )

        if poll_response.error:
            raise Exception(
                f"Seedance task failed. "
                f"Code: {poll_response.error.code}, "
                f"Message: {poll_response.error.message}"
            )

        if poll_response.usage and poll_response.usage.completion_tokens:
            await _log_spend_to_litellm(model_id, poll_response.usage.completion_tokens)

        if not poll_response.content or not poll_response.content.video_url:
            raise Exception("Seedance task succeeded but returned no video URL.")

        # --- Step 3: Register the video with Media Ingest and return its UUID ---
        media_id = await upload_url_via_presigned(cls, poll_response.content.video_url)

        return MediaNodeOutput(
            media_id,
            context=[{
                GenParamKey.MEDIA_ID:         media_id,
                GenParamKey.PROMPT:           prompt,
                GenParamKey.MODEL:            model_id,
                GenParamKey.ASPECT_RATIO:     aspect_ratio,
                GenParamKey.DURATION:         duration,
                GenParamKey.RESOLUTION:       resolution,
                GenParamKey.NEGATIVE_PROMPT:  "",
                GenParamKey.FIRST_FRAME_UUID: first_frame_uuid,
                GenParamKey.LAST_FRAME_UUID:  last_frame_uuid,
            }],
            ui={"video_uuid": [media_id]},
        )


class SeedanceExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            SeedanceTextToVideoNode,
            SeedanceFirstLastFrameNode,
        ]


async def comfy_entrypoint() -> SeedanceExtension:
    return SeedanceExtension()
