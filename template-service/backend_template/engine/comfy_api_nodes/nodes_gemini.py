"""
API Nodes for Gemini Multimodal LLM Usage via Remote API
See: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
"""

import os
from enum import Enum
from fnmatch import fnmatch
from typing import Literal

import google.auth.transport.requests
from google.oauth2 import service_account

from pydantic import BaseModel
from comfy_api.latest import IO
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

GEMINI_BASE_ENDPOINT = f"https://{gemini_config.location}-aiplatform.googleapis.com/v1/projects/{gemini_config.project_id}/locations/{gemini_config.location}/publishers/google/models"

_gcp_credentials = None

def get_vertex_ai_access_token() -> str:
    global _gcp_credentials
    if _gcp_credentials is None:
        _gcp_credentials = service_account.Credentials.from_service_account_file(
            gemini_config.service_account_key_file,
            scopes=["https://www.googleapis.com/auth/cloud-platform"]
        )
    
    if not _gcp_credentials.valid:
        request = google.auth.transport.requests.Request()
        _gcp_credentials.refresh(request)
        
    return _gcp_credentials.token

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

class GetLinkByIdResponse(BaseModel):
    mediaId: str | None = None
    link: str | None = None

async def fetch_media_uri_from_ingest(
    cls: type[IO.ComfyNode],
    media_id: str,
) -> str:
    """Fetches the cloud storage URI for a media file from the Media Ingest API."""
    
    full_url = f"{media_ingest_config.media_ingest_url}/internal/media/{media_id}/link"
    
    # Pass the endpoint with the full URL and query_params 
    response = await sync_op(
        cls,
        endpoint=ApiEndpoint(path=full_url, method="GET", query_params={"linkType": 0}),
        response_model=GetLinkByIdResponse,
        wait_label="Fetching Media Link...",
    )
    
    if not response.link:
        raise ValueError(f"Media Ingest API response for UUID {media_id} did not contain a 'link'.")
        
    return response.link

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


class GeminiNodeAmplify(IO.ComfyNode):
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
            node_id="GeminiNodeAmplify",
            display_name="Google Gemini Amplify",
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
                IO.String.Output(),
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
