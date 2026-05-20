import asyncio
import logging

import litellm

from comfy_api.latest import IO, ComfyExtension
from comfy_api.latest._io import Hidden
from typing_extensions import override

from comfy_api_nodes.util import (
    fetch_media_uri_from_ingest,
    register_media_uri_with_ingest,
    RAIFilteredError,
    VeoTransientError,
)
from comfy_api_nodes.context_keys import GenParamKey, MediaNodeOutput, with_media_context
from config import gemini_config, litellm_config

AVERAGE_DURATION_VIDEO_GEN = 32
MODELS_MAP = {
    "veo-2.0-generate-001": "veo-2.0-generate-001",
    "veo-3.1-generate": "veo-3.1-generate-001",
    "veo-3.1-fast-generate": "veo-3.1-fast-generate-001",
    "veo-3.0-generate-001": "veo-3.0-generate-001",
    "veo-3.0-fast-generate-001": "veo-3.0-fast-generate-001",
    "veo-3.1-lite-generate-001": "veo-3.1-lite-generate-001",
}

_RAI_MAX_ATTEMPTS = 3
_RAI_RETRY_BASE_DELAY = 5.0        # delays: 5s, 10s

_TRANSIENT_MAX_ATTEMPTS = 5
_TRANSIENT_RETRY_BASE_DELAY = 30.0  # delays: 30s, 60s, 120s, 240s

# Retryable HTTP status codes from the LiteLLM proxy (timeout, rate limit, unavailable).
_TRANSIENT_HTTP_CODES = frozenset({408, 429, 502, 503, 504})

logger = logging.getLogger(__name__)


def _litellm_to_transient(exc: Exception) -> VeoTransientError | None:
    """
    If *exc* is a retryable LiteLLM exception, return the equivalent
    VeoTransientError.  Otherwise return None.
    """
    status_code = getattr(exc, "status_code", None)
    if status_code not in _TRANSIENT_HTTP_CODES:
        return None
    return VeoTransientError(message=str(exc), code=status_code)


async def _call_veo_via_litellm(
    model: str,
    prompt: str,
    duration_seconds: int,
    aspect_ratio: str,
    person_generation: str,
    enhance_prompt: bool,
    negative_prompt: str,
    seed: int,
    generate_audio: bool,
    first_frame_uri: str | None,
    last_frame_uri: str | None,
    attempt: int = 0,
) -> str:
    """
    Submit a Veo generation request through the LiteLLM proxy and wait for
    completion.  The proxy handles GCP authentication and Langfuse cost tracking.

    Vertex-specific request fields (instances + parameters) are passed wholesale
    via *extra_body* so nothing is lost in translation.  Vertex writes the video
    to our GCS bucket (storageUri); we receive the gcsUri and register it with
    media-ingest — no video bytes flow through this service.

    Returns the GCS URI of the generated video.
    """
    instance: dict = {"prompt": prompt}
    if first_frame_uri:
        instance["image"] = {"gcsUri": first_frame_uri, "mimeType": "image/png"}
    if last_frame_uri:
        instance["lastFrame"] = {"gcsUri": last_frame_uri, "mimeType": "image/png"}

    is_veo2 = "veo-2" in model
    parameters: dict = {
        "aspectRatio": aspect_ratio,
        "personGeneration": person_generation,
        "durationSeconds": duration_seconds,
        "enhancePrompt": enhance_prompt if is_veo2 else True,
        "storageUri": gemini_config.storage_uri,
    }
    if negative_prompt:
        parameters["negativePrompt"] = negative_prompt
    if seed > 0:
        parameters["seed"] = seed
    if not is_veo2:
        parameters["generateAudio"] = generate_audio

    litellm.api_base = litellm_config.litellm_base_url
    litellm.api_key = litellm_config.litellm_api_key

    op = await asyncio.to_thread(
        litellm.video_generation,
        model=model,
        prompt=prompt,
        seconds=str(duration_seconds),
        extra_body={
            "instances": [instance],
            "parameters": parameters,
        },
    )

    # 2. Poll until the operation completes.
    while True:
        status = await asyncio.to_thread(litellm.video_status, video_id=op.id)
        if status.status == "completed":
            break
        if status.status == "failed":
            error_msg = str(getattr(status, "error", "") or "")
            if any(kw in error_msg.lower() for kw in ("safety", "rai", "responsible ai", "policy")):
                raise RAIFilteredError(reasons=[error_msg], attempt=attempt)
            raise Exception(f"Veo generation failed: {error_msg}")
        await asyncio.sleep(5.0)

    video_bytes = await asyncio.to_thread(litellm.video_content, video_id=op.id)

    gcs_uri = str(video_bytes)
    logger.info("gcs_uri - %s", gcs_uri)
    if not gcs_uri:
        raise RAIFilteredError(reasons=[], attempt=attempt)

    return gcs_uri


class VeoVideoGenerationNode(IO.ComfyNode):
    """
    Generates videos from text prompts using Google's Veo API.

    This node can create videos from text descriptions and optional image inputs,
    with control over parameters like aspect ratio, duration, and more.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="VeoVideoGenerationNode",
            display_name="Google Veo 2 Video Generation",
            category="api node/video/Veo",
            description="Generates videos from text prompts using Google's Veo 2 API",
            is_output_node=True,
            hidden=[Hidden.extra_pnginfo],
            inputs=[
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    tooltip="Text description of the video",
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["16:9", "9:16"],
                    default="16:9",
                    tooltip="Aspect ratio of the output video",
                ),
                IO.String.Input(
                    "negative_prompt",
                    multiline=True,
                    default="",
                    tooltip="Negative text prompt to guide what to avoid in the video",
                    optional=True,
                ),
                IO.Int.Input(
                    "duration_seconds",
                    default=5,
                    min=5,
                    max=8,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    tooltip="Duration of the output video in seconds",
                    optional=True,
                ),
                IO.Boolean.Input(
                    "enhance_prompt",
                    default=True,
                    tooltip="Whether to enhance the prompt with AI assistance",
                    optional=True,
                    advanced=True,
                ),
                IO.Combo.Input(
                    "person_generation",
                    options=["ALLOW", "BLOCK"],
                    default="ALLOW",
                    tooltip="Whether to allow generating people in the video",
                    optional=True,
                    advanced=True,
                ),
                IO.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=0xFFFFFFFF,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    control_after_generate=True,
                    tooltip="Seed for video generation (0 for random)",
                    optional=True,
                ),
                IO.String.Input(
                    "image_uuid",
                    force_input=True,
                    optional=True,
                    tooltip="A Media Ingest API UUID representing an uploaded image"
                ),
                IO.Combo.Input(
                    "model",
                    options=["veo-2.0-generate-001"],
                    default="veo-2.0-generate-001",
                    tooltip="Veo 2 model to use for video generation",
                    optional=True,
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
        prompt,
        aspect_ratio="16:9",
        negative_prompt="",
        duration_seconds=5,
        enhance_prompt=True,
        person_generation="ALLOW",
        seed=0,
        image_uuid=None,
        model="veo-2.0-generate-001",
        generate_audio=False,
    ):
        model = MODELS_MAP[model]

        image_uri: str | None = None
        if image_uuid is not None:
            image_uri = await fetch_media_uri_from_ingest(cls, image_uuid)

        gcs_uri = await _call_veo_via_litellm(
            model=model,
            prompt=prompt,
            duration_seconds=duration_seconds,
            aspect_ratio=aspect_ratio,
            person_generation=person_generation,
            enhance_prompt=enhance_prompt,
            negative_prompt=negative_prompt,
            seed=seed,
            generate_audio=generate_audio,
            first_frame_uri=image_uri,
            last_frame_uri=None,
        )

        media_id = await register_media_uri_with_ingest(cls, gcs_uri, "video/mp4")
        return MediaNodeOutput(
            media_id,
            context=[{
                GenParamKey.MEDIA_ID:         media_id,
                GenParamKey.PROMPT:           prompt,
                GenParamKey.MODEL:            model,
                GenParamKey.ASPECT_RATIO:     aspect_ratio,
                GenParamKey.DURATION:         duration_seconds,
                GenParamKey.RESOLUTION:       "",
                GenParamKey.NEGATIVE_PROMPT:  negative_prompt,
                GenParamKey.FIRST_FRAME_UUID: image_uuid,
                GenParamKey.LAST_FRAME_UUID:  None,
            }],
            ui={"video_uuid": [media_id]},
        )


class Veo3VideoGenerationNode(VeoVideoGenerationNode):
    """
    Generates videos from text prompts using Google's Veo 3 API.

    Supported models:
    - veo-3.0-generate-001
    - veo-3.0-fast-generate-001

    This node extends the base Veo node with Veo 3 specific features including
    audio generation and fixed 8-second duration.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="Veo3VideoGenerationNode",
            display_name="Google Veo 3 Video Generation",
            category="api node/video/Veo",
            description="Generates videos from text prompts using Google's Veo 3 API",
            is_output_node=True,
            hidden=[Hidden.extra_pnginfo],
            inputs=[
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    tooltip="Text description of the video",
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["16:9", "9:16"],
                    default="16:9",
                    tooltip="Aspect ratio of the output video",
                ),
                IO.String.Input(
                    "negative_prompt",
                    multiline=True,
                    default="",
                    tooltip="Negative text prompt to guide what to avoid in the video",
                    optional=True,
                ),
                IO.Int.Input(
                    "duration_seconds",
                    default=8,
                    min=8,
                    max=8,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    tooltip="Duration of the output video in seconds (Veo 3 only supports 8 seconds)",
                    optional=True,
                ),
                IO.Boolean.Input(
                    "enhance_prompt",
                    default=True,
                    tooltip="This parameter is deprecated and ignored.",
                    optional=True,
                    advanced=True,
                ),
                IO.Combo.Input(
                    "person_generation",
                    options=["ALLOW", "BLOCK"],
                    default="ALLOW",
                    tooltip="Whether to allow generating people in the video",
                    optional=True,
                    advanced=True,
                ),
                IO.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=0xFFFFFFFF,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    control_after_generate=True,
                    tooltip="Seed for video generation (0 for random)",
                    optional=True,
                ),
                IO.String.Input(
                    "image_uuid",
                    force_input=True,
                    optional=True,
                    tooltip="A Media Ingest API UUID representing an uploaded image"
                ),
                IO.Combo.Input(
                    "model",
                    options=[
                        "veo-3.1-generate",
                        "veo-3.1-fast-generate",
                        "veo-3.0-generate-001",
                        "veo-3.0-fast-generate-001",
                    ],
                    default="veo-3.0-generate-001",
                    tooltip="Veo 3 model to use for video generation",
                    optional=True,
                ),
                IO.Boolean.Input(
                    "generate_audio",
                    default=False,
                    tooltip="Generate audio for the video. Supported by all Veo 3 models.",
                    optional=True,
                ),
            ],
            outputs=[
                IO.String.Output(display_name="video_uuid"),
            ],
        )


class Veo3FirstLastFrameNode(IO.ComfyNode):

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="Veo3FirstLastFrameNode",
            display_name="Google Veo 3 First-Last-Frame to Video",
            category="api node/video/Veo",
            description="Generate video using prompt and first and last frames.",
            is_output_node=True,
            hidden=[Hidden.extra_pnginfo],
            inputs=[
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    tooltip="Text description of the video",
                ),
                IO.String.Input(
                    "negative_prompt",
                    multiline=True,
                    default="",
                    tooltip="Negative text prompt to guide what to avoid in the video",
                ),
                IO.Combo.Input("resolution", options=["720p", "1080p"]),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["16:9", "9:16"],
                    default="16:9",
                    tooltip="Aspect ratio of the output video",
                ),
                IO.Int.Input(
                    "duration",
                    default=8,
                    min=4,
                    max=8,
                    step=2,
                    display_mode=IO.NumberDisplay.slider,
                    tooltip="Duration of the output video in seconds",
                ),
                IO.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=0xFFFFFFFF,
                    step=1,
                    display_mode=IO.NumberDisplay.number,
                    control_after_generate=True,
                    tooltip="Seed for video generation",
                ),
                IO.String.Input(
                    "first_frame_uuid",
                    force_input=True,
                    optional=True,
                    tooltip="A Media Ingest API UUID representing an uploaded image"
                ),
                IO.String.Input(
                    "last_frame_uuid",
                    force_input=True,
                    optional=True,
                    tooltip="A Media Ingest API UUID representing an uploaded image"
                ),
                IO.Combo.Input(
                    "model",
                    options=["veo-3.1-generate", "veo-3.1-fast-generate", "veo-3.1-lite-generate-001"],
                    default="veo-3.1-lite-generate-001",
                ),
                IO.Boolean.Input(
                    "generate_audio",
                    default=True,
                    tooltip="Generate audio for the video.",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="video_uuid"),
            ],
        )

    @classmethod
    async def _run_veo_generation(
        cls,
        *,
        model: str,
        prompt: str,
        negative_prompt: str,
        resolution: str,
        aspect_ratio: str,
        duration: int,
        seed: int,
        generate_audio: bool,
        first_frame_uri: str | None,
        last_frame_uri: str | None,
        attempt: int,
    ) -> str:
        """
        Submit one Veo generation request through the LiteLLM proxy and wait for
        completion.  Returns the registered MediaIngest media_id on success.

        Raises RAIFilteredError when the generated video is blocked by RAI filters.
        Raises VeoTransientError for retryable service failures.
        All other failures propagate as-is.
        """
        try:
            gcs_uri = await _call_veo_via_litellm(
                model=model,
                prompt=prompt,
                duration_seconds=duration,
                aspect_ratio=aspect_ratio,
                person_generation="ALLOW",
                enhance_prompt=True,
                negative_prompt=negative_prompt,
                seed=seed,
                generate_audio=generate_audio,
                first_frame_uri=first_frame_uri,
                last_frame_uri=last_frame_uri,
            )
        except RAIFilteredError:
            raise RAIFilteredError(reasons=[], attempt=attempt)
        except Exception as exc:
            transient = _litellm_to_transient(exc)
            if transient is not None:
                raise transient from exc
            raise

        return await register_media_uri_with_ingest(cls, gcs_uri, "video/mp4")

    @classmethod
    @with_media_context
    async def execute(
        cls,
        prompt: str,
        negative_prompt: str,
        resolution: str,
        aspect_ratio: str,
        duration: int,
        seed: int,
        first_frame_uuid: str | None = None,
        last_frame_uuid: str | None = None,
        model: str = "veo-3.1-lite-generate-001",
        generate_audio: bool = True,
    ):
        model = MODELS_MAP[model]

        # Resolve frame URIs once — they are stable across RAI retry attempts.
        first_frame_task = (
            asyncio.create_task(fetch_media_uri_from_ingest(cls, first_frame_uuid))
            if first_frame_uuid else None
        )
        last_frame_task = (
            asyncio.create_task(fetch_media_uri_from_ingest(cls, last_frame_uuid))
            if last_frame_uuid else None
        )
        first_frame_uri = await first_frame_task if first_frame_task else None
        last_frame_uri = await last_frame_task if last_frame_task else None

        last_rai_error: RAIFilteredError | None = None
        transient_attempt = 0

        while True:
            last_rai_error = None
            try:
                for attempt in range(1, _RAI_MAX_ATTEMPTS + 1):
                    try:
                        media_id = await cls._run_veo_generation(
                            model=model,
                            prompt=prompt,
                            negative_prompt=negative_prompt,
                            resolution=resolution,
                            aspect_ratio=aspect_ratio,
                            duration=duration,
                            seed=seed,
                            generate_audio=generate_audio,
                            first_frame_uri=first_frame_uri,
                            last_frame_uri=last_frame_uri,
                            attempt=attempt,
                        )
                        return MediaNodeOutput(
                            media_id,
                            context=[{
                                GenParamKey.MEDIA_ID:         media_id,
                                GenParamKey.PROMPT:           prompt,
                                GenParamKey.MODEL:            model,
                                GenParamKey.ASPECT_RATIO:     aspect_ratio,
                                GenParamKey.DURATION:         duration,
                                GenParamKey.RESOLUTION:       resolution,
                                GenParamKey.NEGATIVE_PROMPT:  negative_prompt,
                                GenParamKey.FIRST_FRAME_UUID: first_frame_uuid,
                                GenParamKey.LAST_FRAME_UUID:  last_frame_uuid,
                            }],
                            ui={"video_uuid": [media_id]},
                        )

                    except RAIFilteredError as e:
                        last_rai_error = e
                        logger.warning(
                            "[Veo3FirstLastFrameNode] RAI filter triggered (attempt %d/%d).",
                            attempt,
                            _RAI_MAX_ATTEMPTS,
                        )
                        if attempt < _RAI_MAX_ATTEMPTS:
                            await asyncio.sleep(_RAI_RETRY_BASE_DELAY * (2 ** (attempt - 1)))

                break  # RAI exhausted — exit while loop

            except VeoTransientError as e:
                transient_attempt += 1
                logger.warning(
                    "[Veo3FirstLastFrameNode] Veo unavailable (gRPC %d), "
                    "transient attempt %d/%d: %s",
                    e.code,
                    transient_attempt,
                    _TRANSIENT_MAX_ATTEMPTS,
                    e.message,
                )
                if transient_attempt >= _TRANSIENT_MAX_ATTEMPTS:
                    logger.error(
                        "[Veo3FirstLastFrameNode] Veo unavailable after %d transient attempts. "
                        "Giving up.\nPrompt: %s",
                        _TRANSIENT_MAX_ATTEMPTS,
                        prompt,
                    )
                    raise
                delay = _TRANSIENT_RETRY_BASE_DELAY * (2 ** (transient_attempt - 1))
                logger.info(
                    "[Veo3FirstLastFrameNode] Waiting %.0fs before retry...", delay
                )
                await asyncio.sleep(delay)

        # RAI exhausted — return designated fallback placeholder.
        logger.error(
            "[Veo3FirstLastFrameNode] RAI filter exhausted after %d attempts. "
            "Returning fallback UUID.\nPrompt: %s",
            _RAI_MAX_ATTEMPTS,
            prompt,
        )
        fallback = gemini_config.rai_fallback_video_uuid
        return IO.NodeOutput(fallback, ui={"video_uuid": [fallback]})


class VeoExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            VeoVideoGenerationNode,
            Veo3VideoGenerationNode,
            Veo3FirstLastFrameNode,
        ]


async def comfy_entrypoint() -> VeoExtension:
    return VeoExtension()
