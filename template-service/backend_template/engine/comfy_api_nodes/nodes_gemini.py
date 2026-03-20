"""
API Nodes for Gemini Multimodal LLM Usage via Remote API
See: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
"""

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
    image_uuids: list[str] = []
    parts = get_parts_by_type(response, "image/*")
    
    upload_url = f"{media_ingest_config.media_ingest_url}/internal/media"
    
    for idx, part in enumerate(parts):
        if part.inlineData:
            image_data = base64.b64decode(part.inlineData.data)
            
            ext = "png"
            if part.inlineData.mimeType:
                mime = part.inlineData.mimeType.value
                if "jpeg" in mime or "jpg" in mime:
                    ext = "jpg"
                elif "webp" in mime:
                    ext = "webp"
            
            filename = f"gemini_output_{uuid.uuid4().hex[:8]}.{ext}"
            
            import requests
            import asyncio
            import logging
            
            def safe_sync_upload():
                resp = requests.post(
                    upload_url, 
                    headers={"Accept": "application/json"},
                    files={"file": (filename, image_data, f"image/{ext}")}
                )
                resp.raise_for_status()
                return resp.json()

            try:
                # Delegate the blocking IO to a background OS thread to save the event loop
                json_data = await asyncio.to_thread(safe_sync_upload)
                image_uuids.append(json_data["mediaId"])
            except Exception as e:
                logging.error(f"Failed to upload to Media Ingest API via requests thread: {e}")
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
            ],
            outputs=[
                IO.String.Output(display_name="text"),
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
                systemInstruction=gemini_system_prompt,
            ),
            response_model=GeminiGenerateContentResponse,
        )

        output_text = get_text_from_response(response)
        return IO.NodeOutput(output_text or "Empty response from Gemini model...")

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

        return IO.NodeOutput(await upload_images_and_get_uuids(cls, response), get_text_from_response(response))

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

        return IO.NodeOutput(await upload_images_and_get_uuids(cls, response), get_text_from_response(response))

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
    