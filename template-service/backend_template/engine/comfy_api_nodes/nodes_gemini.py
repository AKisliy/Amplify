"""
API Nodes for Gemini Multimodal LLM Usage via Remote API
See: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
"""

import json
from enum import Enum
from fnmatch import fnmatch
from typing import Literal

from comfy_api.latest import IO, ComfyExtension
from typing_extensions import override
from comfy_api_nodes.apis.gemini import (
    GeminiContent,
    GeminiFileData,
    GeminiGenerateContentRequest,
    GeminiGenerateContentResponse,
    GeminiGenerationConfig,
    GeminiImageConfig,
    GeminiImageGenerateContentRequest,
    GeminiImageGenerationConfig,
    GeminiInlineData,
    GeminiMimeType,
    GeminiPart,
    GeminiRole,
    GeminiSystemInstructionContent,
    GeminiTextPart,
    Modality,
)
from comfy_api_nodes.util import (
    ApiEndpoint,
    sync_op,
    validate_string,
)

from config import gemini_config, media_ingest_config

import base64
import uuid

from comfy_api_nodes.util import get_vertex_ai_access_token, fetch_media_uri_from_ingest


GEMINI_BASE_ENDPOINT = f"https://aiplatform.googleapis.com/v1/projects/{gemini_config.project_id}/locations/{gemini_config.location}/publishers/google/models"

# ---------------------------------------------------------------------------
# Pacing zone table — empirically calibrated from avatar video experiments.
# Green: target zone. Yellow: acceptable. Outside yellow: red (avoid).
# ---------------------------------------------------------------------------
PACING_ZONES: dict[int, dict[str, tuple[int, int]]] = {
    4: {"green": (70, 80),   "yellow": (65, 85)},
    6: {"green": (105, 120), "yellow": (98, 128)},
    8: {"green": (140, 160), "yellow": (130, 170)},
}


def best_duration_for_chars(char_count: int) -> int:
    """
    Given a segment's character count, return the video duration (4, 6, or 8 s)
    whose pacing zone best fits it.

    Priority: green zone first, then yellow, then longest available (8 s).
    """
    for dur in [4, 6, 8]:
        lo, hi = PACING_ZONES[dur]["green"]
        if lo <= char_count <= hi:
            return dur
    for dur in [4, 6, 8]:
        lo, hi = PACING_ZONES[dur]["yellow"]
        if lo <= char_count <= hi:
            return dur
    return 8  # fallback: give the avatar as much time as possible


class GeminiModel(str, Enum):
    """
    Gemini Model Names allowed by comfy-api
    """

    gemini_2_5_pro_preview_05_06 = "gemini-2.5-pro-preview-05-06"
    gemini_2_5_flash_preview_04_17 = "gemini-2.5-flash-preview-04-17"
    gemini_2_5_pro = "gemini-2.5-pro"
    gemini_2_5_flash = "gemini-2.5-flash"
    gemini_3_0_pro = "gemini-3-pro-preview"


class GeminiImageModel(str, Enum):
    """
    Gemini Image Model Names allowed by comfy-api
    """

    gemini_2_5_flash_image_preview = "gemini-2.5-flash-image-preview"
    gemini_2_5_flash_image = "gemini-2.5-flash-image"


async def create_image_parts(
    cls: type[IO.ComfyNode],
    image_uuids: dict | None,
) -> list[GeminiPart]:
    image_parts: list[GeminiPart] = []
    
    if not image_uuids:
        return image_parts

    uuids = list(image_uuids.values())
    if len(uuids) == 0:
        return image_parts

    # The Vertex API limits us to 10 image files per request
    num_url_images = min(len(uuids), 10)
    
    for idx in range(num_url_images):
        media_id = uuids[idx]
        if not media_id:
            continue
            
        # Fetch the actual GS URI from the Media Ingest API
        reference_image_url = await fetch_media_uri_from_ingest(cls, media_id)
        # We assume image/png by default, but you could add logic to guess from the URL extension
        image_parts.append(
            GeminiPart(
                fileData=GeminiFileData(
                    mimeType=GeminiMimeType.image_png,
                    fileUri=reference_image_url,
                )
            )
        )
        
    return image_parts


def _mime_matches(mime: GeminiMimeType | None, pattern: str) -> bool:
    """Check if a MIME type matches a pattern. Supports fnmatch globs (e.g. 'image/*')."""
    if mime is None:
        return False
    return fnmatch(mime.value, pattern)


def get_parts_by_type(response: GeminiGenerateContentResponse, part_type: Literal["text"] | str) -> list[GeminiPart]:
    """
    Filter response parts by their type.

    Args:
        response: The API response from Gemini.
        part_type: Type of parts to extract ("text" or a MIME type).

    Returns:
        List of response parts matching the requested type.
    """
    if not response.candidates:
        if response.promptFeedback and response.promptFeedback.blockReason:
            feedback = response.promptFeedback
            raise ValueError(
                f"Gemini API blocked the request. Reason: {feedback.blockReason} ({feedback.blockReasonMessage})"
            )
        raise ValueError(
            "Gemini API returned no response candidates. If you are using the `IMAGE` modality, "
            "try changing it to `IMAGE+TEXT` to view the model's reasoning and understand why image generation failed."
        )
    parts = []
    blocked_reasons = []
    for candidate in response.candidates:
        if candidate.finishReason and candidate.finishReason.upper() == "IMAGE_PROHIBITED_CONTENT":
            blocked_reasons.append(candidate.finishReason)
            continue
        if candidate.content is None or candidate.content.parts is None:
            continue
        for part in candidate.content.parts:
            if part_type == "text" and part.text:
                parts.append(part)
            elif part.inlineData and _mime_matches(part.inlineData.mimeType, part_type):
                parts.append(part)
            elif part.fileData and _mime_matches(part.fileData.mimeType, part_type):
                parts.append(part)

    if not parts and blocked_reasons:
        raise ValueError(f"Gemini API blocked the request. Reasons: {blocked_reasons}")

    return parts


def get_text_from_response(response: GeminiGenerateContentResponse) -> str:
    """
    Extract and concatenate all text parts from the response.

    Args:
        response: The API response from Gemini.

    Returns:
        Combined text from all text parts in the response.
    """
    parts = get_parts_by_type(response, "text")
    return "\n".join([part.text for part in parts])


async def upload_images_and_get_uuids(cls: type[IO.ComfyNode], response: GeminiGenerateContentResponse) -> str:
    import requests
    import asyncio
    import logging

    image_uuids: list[str] = []
    parts = get_parts_by_type(response, "image/*")
    base_url = f"{media_ingest_config.media_ingest_url}/internal/media"

    for idx, part in enumerate(parts):
        if part.inlineData:
            image_data = base64.b64decode(part.inlineData.data)

            ext = "png"
            content_type = f"image/{ext}"
            if part.inlineData.mimeType:
                mime = part.inlineData.mimeType.value
                if "jpeg" in mime or "jpg" in mime:
                    ext = "jpg"
                    content_type = "image/jpeg"
                elif "webp" in mime:
                    ext = "webp"
                    content_type = "image/webp"

            filename = f"gemini_output_{uuid.uuid4().hex[:8]}.{ext}"
            file_size = len(image_data)

            def safe_sync_upload():
                # 1. Register and get presigned PUT URL
                register_resp = requests.post(
                    f"{base_url}/presigned-upload",
                    json={"fileName": filename, "contentType": content_type, "fileSize": file_size},
                    timeout=30,
                )
                register_resp.raise_for_status()
                data = register_resp.json()
                media_id: str = data["mediaId"]
                upload_url: str = data["uploadUrl"]

                # 2. PUT bytes directly to S3
                put_resp = requests.put(
                    upload_url,
                    data=image_data,
                    headers={"Content-Type": content_type},
                    timeout=120,
                )
                put_resp.raise_for_status()

                # 3. Confirm upload — triggers preprocessing pipeline
                confirm_resp = requests.post(
                    f"{base_url}/{media_id}/upload-completed",
                    timeout=30,
                )
                confirm_resp.raise_for_status()

                return media_id

            try:
                # Delegate blocking IO to a background OS thread to save the event loop
                media_id = await asyncio.to_thread(safe_sync_upload)
                image_uuids.append(media_id)
            except Exception as e:
                logging.error(f"Failed to upload Gemini image to media-ingest: {e}")
                raise

        else:
            # If Vertex returned it as a Vertex URI (unlikely but possible),
            # we would need to download and re-upload. For now, throw an error.
            raise NotImplementedError("Vertex returned a fileUri instead of inlineData, which is not currently mapped for upload.")

    if len(image_uuids) == 0:
        return ""
        
    if len(image_uuids) > 1:
        raise ValueError(f"Expected 1 image from Gemini, but received {len(image_uuids)}.")

    return image_uuids[0]


def calculate_tokens_price(response: GeminiGenerateContentResponse) -> float | None:
    if not response.modelVersion:
        return None
    # Define prices (Cost per 1,000,000 tokens), see https://cloud.google.com/vertex-ai/generative-ai/pricing
    if response.modelVersion in ("gemini-2.5-pro-preview-05-06", "gemini-2.5-pro"):
        input_tokens_price = 1.25
        output_text_tokens_price = 10.0
        output_image_tokens_price = 0.0
    elif response.modelVersion in (
        "gemini-2.5-flash-preview-04-17",
        "gemini-2.5-flash",
    ):
        input_tokens_price = 0.30
        output_text_tokens_price = 2.50
        output_image_tokens_price = 0.0
    elif response.modelVersion in (
        "gemini-2.5-flash-image-preview",
        "gemini-2.5-flash-image",
    ):
        input_tokens_price = 0.30
        output_text_tokens_price = 2.50
        output_image_tokens_price = 30.0
    elif response.modelVersion == "gemini-3-pro-preview":
        input_tokens_price = 2
        output_text_tokens_price = 12.0
        output_image_tokens_price = 0.0
    elif response.modelVersion == "gemini-3-pro-image-preview":
        input_tokens_price = 2
        output_text_tokens_price = 12.0
        output_image_tokens_price = 120.0
    else:
        return None
    final_price = response.usageMetadata.promptTokenCount * input_tokens_price
    if response.usageMetadata.candidatesTokensDetails:
        for i in response.usageMetadata.candidatesTokensDetails:
            if i.modality == Modality.IMAGE:
                final_price += output_image_tokens_price * i.tokenCount  # for Nano Banana models
            else:
                final_price += output_text_tokens_price * i.tokenCount
    if response.usageMetadata.thoughtsTokenCount:
        final_price += output_text_tokens_price * response.usageMetadata.thoughtsTokenCount
    return final_price / 1_000_000.0


class GeminiNode(IO.ComfyNode):
    """
    Node to generate text responses from a Gemini model.

    This node allows users to interact with Google's Gemini AI models, providing
    multimodal inputs (text, images, audio, video, files) to generate coherent
    text responses. The node works with the latest Gemini models, handling the
    API communication and response parsing.
    """

    @classmethod
    def define_schema(cls):
        autogrow_template = IO.Autogrow.TemplatePrefix(
            input=IO.String.Input("image_uuid", optional=True, tooltip="A Media Ingest API UUID representing an uploaded image"),
            prefix="image_uuid",
            min=1,
            max=10
        )
        return IO.Schema(
            node_id="GeminiNode",
            display_name="Google Gemini",
            category="api node/text/Gemini",
            description="Generate text responses with Google's Gemini AI model. "
            "You can provide multiple types of inputs (text, images, audio, video) "
            "as context for generating more relevant and meaningful responses.",
            is_output_node=True,
            inputs=[
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    default="",
                    tooltip="Text inputs to the model, used to generate a response. "
                    "You can include detailed instructions, questions, or context for the model.",
                ),
                IO.Combo.Input(
                    "model",
                    options=GeminiModel,
                    default=GeminiModel.gemini_2_5_pro,
                    tooltip="The Gemini model to use for generating responses.",
                ),
                IO.String.Input(
                    "system_prompt",
                    multiline=True,
                    default="",
                    optional=True,
                    tooltip="Foundational instructions that dictate an AI's behavior.",
                    advanced=True,
                ),
                IO.Autogrow.Input(
                    "images",
                    template=autogrow_template,
                    optional=True,
                    tooltip="Optional image UUIDs to use as context for the model.",
                ),
                IO.String.Input(
                    "video_uuid",
                    force_input=True,
                    optional=True,
                    tooltip="Optional video UUID to use as context for the model.",
                ),
                IO.String.Input(
                    "response_schema",
                    multiline=True,
                    default="",
                    optional=True,
                    tooltip="Optional JSON Schema string. When provided, Gemini returns "
                    "structured JSON matching this schema. The first array property "
                    "found is extracted into the 'segments' list output.",
                    advanced=True,
                ),
                IO.Int.Input(
                    "seed",
                    default=0,
                    min=0,
                    max=2**31 - 1,
                    tooltip="Change this value to generate a new response. Not sent to the model.",
                    control_after_generate=True,
                ),
            ],
            outputs=[
                IO.String.Output(display_name="text"),
                IO.String.Output(
                    display_name="segments",
                    is_output_list=True,
                ),
                IO.Int.Output(
                    display_name="duration_seconds",
                    is_output_list=True,
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        prompt: str,
        model: str,
        system_prompt: str = "",
        images: IO.Autogrow.Type | None = None,
        video_uuid: str = "",
        response_schema: str = "",
        seed: int = 0,
    ) -> IO.NodeOutput:
        prompt = validate_string(prompt, strip_whitespace=True)

        # Create parts list with text prompt as the first part
        parts: list[GeminiPart] = [GeminiPart(text=prompt)]

        # Add image modal parts
        if images is not None:
            parts.extend(await create_image_parts(cls, images))
            
        # Add video modal part
        video_uuid = video_uuid.strip()
        if video_uuid:
            video_uri = await fetch_media_uri_from_ingest(cls, video_uuid)
            parts.append(
                GeminiPart(
                    fileData=GeminiFileData(
                        mimeType=GeminiMimeType.video_mp4,
                        fileUri=video_uri,
                    )
                )
            )
        
        gemini_system_prompt = None
        if system_prompt:
            gemini_system_prompt = GeminiSystemInstructionContent(parts=[GeminiTextPart(text=system_prompt)], role=None)

        # Build generationConfig when structured output is requested
        generation_config = None
        response_schema = response_schema.strip() if response_schema else ""
        if response_schema:
            schema_dict = json.loads(response_schema)
            generation_config = GeminiGenerationConfig(
                responseMimeType="application/json",
                responseSchema=schema_dict,
            )

        token = get_vertex_ai_access_token()
        
        response = await sync_op(
            cls,
            endpoint=ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:generateContent", 
                method="POST", 
                headers={"Authorization": f"Bearer {token}"}
            ),
            data=GeminiGenerateContentRequest(
                contents=[
                    GeminiContent(
                        role=GeminiRole.user,
                        parts=parts,
                    )
                ],
                generationConfig=generation_config,
                systemInstruction=gemini_system_prompt,
            ),
            response_model=GeminiGenerateContentResponse,
        )

        output_text = get_text_from_response(response) or "Empty response from Gemini model..."

        # Parse structured output into segments and duration_seconds when schema was provided.
        # Handles three schema shapes:
        #   1. No schema                          → both lists empty.
        #   2. {script_segment}                   → segments populated; duration derived via
        #                                            Python char-count post-processing.
        #   3. {script_segment, duration_seconds} → same — LLM-suggested duration is ignored;
        #                                            Python char count always wins for accuracy.
        segments: list[str] = []
        duration_seconds: list[int] = []
        if response_schema:
            parsed = json.loads(output_text)
            # Extract the first array property from the response
            raw_items: list = []
            if isinstance(parsed, list):
                raw_items = parsed
            elif isinstance(parsed, dict):
                for value in parsed.values():
                    if isinstance(value, list):
                        raw_items = value
                        break
            for item in raw_items:
                if isinstance(item, str):
                    # Plain-string schema
                    seg = item.strip()
                    segments.append(seg)
                    duration_seconds.append(best_duration_for_chars(len(seg)))
                elif isinstance(item, dict):
                    if "script_segment" in item:
                        seg = item["script_segment"].strip()
                        segments.append(seg)
                        if "duration_seconds" in item:
                            # Trust Gemini's duration choice — it has full segment context.
                            # best_duration_for_chars is only a fallback for schemas without
                            # a duration field, not an override of an explicit model decision.
                            try:
                                dur = int(item["duration_seconds"])
                                if dur not in (4, 6, 8):
                                    dur = best_duration_for_chars(len(seg))
                            except (ValueError, TypeError):
                                dur = best_duration_for_chars(len(seg))
                            duration_seconds.append(dur)
                        else:
                            # script_segment-only schema — compute duration from char count.
                            duration_seconds.append(best_duration_for_chars(len(seg)))
                    else:
                        # Unknown schema shape — grab the first non-empty string value.
                        for v in item.values():
                            if isinstance(v, str) and v.strip():
                                seg = v.strip()
                                segments.append(seg)
                                duration_seconds.append(best_duration_for_chars(len(seg)))
                                break

        # Safety net: model returned an empty segments array despite a non-empty transcript.
        # This happens when the input is shorter than the minimum yellow zone (65 chars for 4 s)
        # and the model treats it as "no valid segments". Fall back to a single segment so
        # downstream nodes always receive at least one item.
        # Duration is hardcoded to 4 — this branch only fires for very short transcripts,
        # so the shortest clip is the only sensible choice. (best_duration_for_chars would
        # incorrectly return 8 as its out-of-zone fallback here.)
        if response_schema and not segments and output_text.strip():
            seg = output_text.strip()
            # logger.warning(
            #     "[GeminiNode] Model returned empty segments for a %d-char transcript. "
            #     "Falling back to a single 4-second segment.",
            #     len(seg),
            # )
            segments = [seg]
            duration_seconds = [4]

        return IO.NodeOutput(output_text, segments, duration_seconds, ui={"text": [output_text]})

class GeminiImageNode(IO.ComfyNode):

    @classmethod
    def define_schema(cls):
        autogrow_template = IO.Autogrow.TemplatePrefix(
            input=IO.String.Input("image_uuid", optional=True, tooltip="A Media Ingest API UUID representing an uploaded image"),
            prefix="image_uuid",
            min=1,
            max=3
        )
        return IO.Schema(
            node_id="GeminiImageNode",
            display_name="Nano Banana (Google Gemini Image)",
            category="api node/image/Gemini",
            description="Edit images synchronously via Google API.",
            is_output_node=True,
            inputs=[
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    tooltip="Text prompt for generation",
                    default="",
                ),
                IO.Combo.Input(
                    "model",
                    options=GeminiImageModel,
                    default=GeminiImageModel.gemini_2_5_flash_image,
                    tooltip="The Gemini model to use for generating responses.",
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["auto", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
                    default="auto",
                    tooltip="Defaults to matching the output image size to that of your input image, "
                    "or otherwise generates 1:1 squares.",
                    optional=True,
                ),
                IO.Autogrow.Input(
                    "images",
                    template=autogrow_template,
                    optional=True,
                    tooltip="Optional image UUIDs to use as context for the model.",
                ),
                IO.Combo.Input(
                    "response_modalities",
                    options=["IMAGE+TEXT", "IMAGE"],
                    tooltip="Choose 'IMAGE' for image-only output, or "
                    "'IMAGE+TEXT' to return both the generated image and a text response.",
                    optional=True,
                    advanced=True,
                ),
                IO.String.Input(
                    "system_prompt",
                    multiline=True,
                    optional=True,
                    tooltip="Foundational instructions that dictate an AI's behavior.",
                    advanced=True,
                ),
            ],
            outputs=[
                IO.String.Output(display_name="image_uuid"),
                IO.String.Output(display_name="text"),
            ],
        )

    @classmethod
    async def execute(
        cls,
        prompt: str,
        model: str,
        aspect_ratio: str = "auto",
        images: IO.Autogrow.Type | None = None,
        response_modalities: str = "IMAGE+TEXT",
        system_prompt: str = "",
    ) -> IO.NodeOutput:
        prompt = validate_string(prompt, strip_whitespace=True, min_length=1)
        parts: list[GeminiPart] = [GeminiPart(text=prompt)]

        if not aspect_ratio:
            aspect_ratio = "auto"  # for backward compatability with old workflows; to-do remove this in December
        image_config = GeminiImageConfig() if aspect_ratio == "auto" else GeminiImageConfig(aspectRatio=aspect_ratio)

        if images is not None:
            parts.extend(await create_image_parts(cls, images))

        gemini_system_prompt = None
        if system_prompt:
            gemini_system_prompt = GeminiSystemInstructionContent(parts=[GeminiTextPart(text=system_prompt)], role=None)

        token = get_vertex_ai_access_token()

        response = await sync_op(
            cls,
            endpoint=ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:generateContent", 
                method="POST", 
                headers={"Authorization": f"Bearer {token}"}
            ),
            data=GeminiImageGenerateContentRequest(
                contents=[
                    GeminiContent(role=GeminiRole.user, parts=parts),
                ],
                generationConfig=GeminiImageGenerationConfig(
                    responseModalities=(["IMAGE"] if response_modalities == "IMAGE" else ["TEXT", "IMAGE"]),
                    imageConfig=image_config,
                ),
                systemInstruction=gemini_system_prompt,
            ),
            response_model=GeminiGenerateContentResponse,
        )

        image_uuid = await upload_images_and_get_uuids(cls, response)
        text = get_text_from_response(response)
        return IO.NodeOutput(image_uuid, text, ui={"image_uuid": [image_uuid], "text": [text]})

class GeminiImage2Node(IO.ComfyNode):

    @classmethod
    def define_schema(cls):
        autogrow_template = IO.Autogrow.TemplatePrefix(
            input=IO.String.Input("image_uuid", optional=True, tooltip="A Media Ingest API UUID representing an uploaded image"),
            prefix="image_uuid",
            min=1,
            max=14
        )
        return IO.Schema(
            node_id="GeminiImage2Node",
            display_name="Nano Banana Pro (Google Gemini Image)",
            category="api node/image/Gemini",
            description="Generate or edit images synchronously via Google Vertex API.",
            is_output_node=True,
            inputs=[
                IO.String.Input(
                    "prompt",
                    multiline=True,
                    tooltip="Text prompt describing the image to generate or the edits to apply. "
                    "Include any constraints, styles, or details the model should follow.",
                    default="",
                ),
                IO.Combo.Input(
                    "model",
                    options=["gemini-3-pro-image-preview"],
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["auto", "1:1", "2:3", "3:2", "3:4", "4:3", "4:5", "5:4", "9:16", "16:9", "21:9"],
                    default="auto",
                    tooltip="If set to 'auto', matches your input image's aspect ratio; "
                    "if no image is provided, a 16:9 square is usually generated.",
                ),
                IO.Combo.Input(
                    "resolution",
                    options=["1K", "2K", "4K"],
                    tooltip="Target output resolution. For 2K/4K the native Gemini upscaler is used.",
                ),
                IO.Combo.Input(
                    "response_modalities",
                    options=["IMAGE+TEXT", "IMAGE"],
                    tooltip="Choose 'IMAGE' for image-only output, or "
                    "'IMAGE+TEXT' to return both the generated image and a text response.",
                    advanced=True,
                ),
                IO.Autogrow.Input(
                    "images",
                    template=autogrow_template,
                    optional=True,
                    tooltip="Optional image UUIDs to use as context for the model.",
                ),
                IO.String.Input(
                    "system_prompt",
                    multiline=True,
                    optional=True,
                    tooltip="Foundational instructions that dictate an AI's behavior.",
                    advanced=True,
                ),
            ],
            outputs=[
                IO.String.Output(display_name="image_uuid"),
                IO.String.Output(display_name="text"),
            ],
        )

    @classmethod
    async def execute(
        cls,
        prompt: str,
        model: str,
        aspect_ratio: str,
        resolution: str,
        response_modalities: str,
        images: IO.Autogrow.Type | None = None,
        system_prompt: str = "",
    ) -> IO.NodeOutput:
        prompt = validate_string(prompt, strip_whitespace=True, min_length=1)

        parts: list[GeminiPart] = [GeminiPart(text=prompt)]
        if images is not None:
            parts.extend(await create_image_parts(cls, images))

        image_config = GeminiImageConfig(imageSize=resolution)
        if aspect_ratio != "auto":
            image_config.aspectRatio = aspect_ratio

        gemini_system_prompt = None
        if system_prompt:
            gemini_system_prompt = GeminiSystemInstructionContent(parts=[GeminiTextPart(text=system_prompt)], role=None)

        token = get_vertex_ai_access_token()

        response = await sync_op(
            cls,
            endpoint=ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{model}:generateContent", 
                method="POST", 
                headers={"Authorization": f"Bearer {token}"}
            ),
            data=GeminiImageGenerateContentRequest(
                contents=[
                    GeminiContent(role=GeminiRole.user, parts=parts),
                ],
                generationConfig=GeminiImageGenerationConfig(
                    responseModalities=(["IMAGE"] if response_modalities == "IMAGE" else ["TEXT", "IMAGE"]),
                    imageConfig=image_config,
                ),
                systemInstruction=gemini_system_prompt,
            ),
            response_model=GeminiGenerateContentResponse,
            price_extractor=calculate_tokens_price,
        )

        image_uuid = await upload_images_and_get_uuids(cls, response)
        text = get_text_from_response(response)
        return IO.NodeOutput(image_uuid, text, ui={"image_uuid": [image_uuid], "text": [text]})

class GeminiExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [
            GeminiNode,
            GeminiImageNode,
            GeminiImage2Node,
        ]


async def comfy_entrypoint() -> GeminiExtension:
    return GeminiExtension()
    