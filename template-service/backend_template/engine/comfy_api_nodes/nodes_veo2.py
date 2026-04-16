import base64
import asyncio

from comfy_api.latest import IO, ComfyExtension
from typing_extensions import override
from comfy_api_nodes.apis.veo import (
    VeoGenVidPollRequest,
    VeoGenVidPollResponse,
    VeoGenVidRequest,
    VeoGenVidResponse,
    VeoRequestInstance,
    VeoRequestInstanceImage,
    VeoRequestParameters,
)
from comfy_api_nodes.util import (
    ApiEndpoint,
    poll_op,
    sync_op,
)

from comfy_api_nodes.util import get_vertex_ai_access_token, fetch_media_uri_from_ingest, register_media_uri_with_ingest

from config import gemini_config
import base64

AVERAGE_DURATION_VIDEO_GEN = 32
MODELS_MAP = {
    "veo-2.0-generate-001": "veo-2.0-generate-001",
    "veo-3.1-generate": "veo-3.1-generate-001",
    "veo-3.1-fast-generate": "veo-3.1-fast-generate-001",
    "veo-3.0-generate-001": "veo-3.0-generate-001",
    "veo-3.0-fast-generate-001": "veo-3.0-fast-generate-001",
    "veo-3.1-lite-generate-001": "veo-3.1-lite-generate-001",
}

GEMINI_BASE_ENDPOINT = f"https://aiplatform.googleapis.com/v1/projects/{gemini_config.project_id}/locations/{gemini_config.location}/publishers/google/models"



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
        # Prepare the instances for the request
        instances = []

        instance = {"prompt": prompt}

        # Add image if provided
        if image_uuid is not None:
            gcs_uri = await fetch_media_uri_from_ingest(cls, image_uuid)
            instance["image"] = {"gcsUri": gcs_uri, "mimeType": "image/png"}

        instances.append(instance)

        # Create parameters dictionary
        parameters = {
            "aspectRatio": aspect_ratio,
            "personGeneration": person_generation,
            "durationSeconds": duration_seconds,
            "enhancePrompt": enhance_prompt,
            "storageUri": gemini_config.storage_uri,
        }

        # Add optional parameters if provided
        if negative_prompt:
            parameters["negativePrompt"] = negative_prompt
        if seed > 0:
            parameters["seed"] = seed
        # Only add generateAudio for Veo 3 models
        if model.find("veo-2.0") == -1:
            parameters["generateAudio"] = generate_audio
            # force "enhance_prompt" to True for Veo3 models
            parameters["enhancePrompt"] = True

        initial_response = await sync_op(
            cls,
            ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:predictLongRunning", 
                method="POST", 
                headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"}
            ),
            response_model=VeoGenVidResponse,
            data=VeoGenVidRequest(
                instances=instances,
                parameters=parameters,
            ),
        )

        def status_extractor(response):
            # Only return "completed" if the operation is done, regardless of success or failure
            # We'll check for errors after polling completes
            return "completed" if response.done else "pending"

        poll_response = await poll_op(
            cls,
            ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:fetchPredictOperation", 
                method="POST", 
                headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"}
            ),
            response_model=VeoGenVidPollResponse,
            status_extractor=status_extractor,
            data=VeoGenVidPollRequest(
                operationName=initial_response.name,
            ),
            poll_interval=5.0,
            estimated_duration=AVERAGE_DURATION_VIDEO_GEN,
        )

        # Now check for errors in the final response
        # Check for error in poll response
        if poll_response.error:
            raise Exception(f"Veo API error: {poll_response.error.message} (code: {poll_response.error.code})")

        # Check for RAI filtered content
        if (
            hasattr(poll_response.response, "raiMediaFilteredCount")
            and poll_response.response.raiMediaFilteredCount > 0
        ):

            # Extract reason message if available
            if (
                hasattr(poll_response.response, "raiMediaFilteredReasons")
                and poll_response.response.raiMediaFilteredReasons
            ):
                reason = poll_response.response.raiMediaFilteredReasons[0]
                error_message = f"Content filtered by Google's Responsible AI practices: {reason} ({poll_response.response.raiMediaFilteredCount} videos filtered.)"
            else:
                error_message = f"Content filtered by Google's Responsible AI practices ({poll_response.response.raiMediaFilteredCount} videos filtered.)"

            raise Exception(error_message)

        # Extract video data
        if (
            poll_response.response
            and hasattr(poll_response.response, "videos")
            and poll_response.response.videos
            and len(poll_response.response.videos) > 0
        ):
            video = poll_response.response.videos[0]

            if hasattr(video, "gcsUri") and video.gcsUri:

                media_id = await register_media_uri_with_ingest(cls, video.gcsUri, "video/mp4")
                return IO.NodeOutput(media_id, ui={"video_uuid": [media_id]})

            raise Exception("Video returned but no data or URL was provided")
        raise Exception("Video generation completed but no video was returned")


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

        initial_response = await sync_op(
            cls,
            ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:predictLongRunning",
                method="POST",
                headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"}
            ),
            response_model=VeoGenVidResponse,
            data=VeoGenVidRequest(
                instances=[
                    VeoRequestInstance(
                        prompt=prompt,
                        image=VeoRequestInstanceImage(
                            gcsUri=first_frame_uri, mimeType="image/png"
                        ) if first_frame_uri else None,
                        lastFrame=VeoRequestInstanceImage(
                            gcsUri=last_frame_uri, mimeType="image/png"
                        ) if last_frame_uri else None,
                    ),
                ],
                parameters=VeoRequestParameters(
                    aspectRatio=aspect_ratio,
                    personGeneration="ALLOW",
                    durationSeconds=duration,
                    enhancePrompt=True,  # cannot be False for Veo3
                    seed=seed,
                    generateAudio=generate_audio,
                    negativePrompt=negative_prompt,
                    resolution=resolution,
                    storageUri=gemini_config.storage_uri
                ),
            ),
        )
        poll_response = await poll_op(
            cls,
            ApiEndpoint(    
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:fetchPredictOperation", 
                method="POST", 
                headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"}
            ),
            response_model=VeoGenVidPollResponse,
            status_extractor=lambda r: "completed" if r.done else "pending",
            data=VeoGenVidPollRequest(
                operationName=initial_response.name,
            ),
            poll_interval=5.0,
            estimated_duration=AVERAGE_DURATION_VIDEO_GEN,
        )

        if poll_response.error:
            raise Exception(f"Veo API error: {poll_response.error.message} (code: {poll_response.error.code})")

        response = poll_response.response
        filtered_count = response.raiMediaFilteredCount
        if filtered_count:
            reasons = response.raiMediaFilteredReasons or []
            reason_part = f": {reasons[0]}" if reasons else ""
            raise Exception(
                f"Content blocked by Google's Responsible AI filters{reason_part} "
                f"({filtered_count} video{'s' if filtered_count != 1 else ''} filtered)."
            )

        if response.videos:
            video = response.videos[0]
            if video.gcsUri:
                media_id = await register_media_uri_with_ingest(cls, video.gcsUri, "video/mp4")
                return IO.NodeOutput(media_id, ui={"video_uuid": [media_id]})
            raise Exception("Video returned but no data or URL was provided")
        raise Exception("Video generation completed but no video was returned")

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
