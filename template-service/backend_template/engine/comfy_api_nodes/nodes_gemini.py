"""
API Nodes for Gemini Multimodal LLM Usage via Remote API
See: https://cloud.google.com/vertex-ai/generative-ai/docs/model-reference/inference
"""

import os
from enum import Enum
from fnmatch import fnmatch
from typing import Literal

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

from config import gemini_config 

GEMINI_BASE_ENDPOINT = "https://aiplatform.googleapis.com/v1/publishers/google/models"

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
                IO.Int.Input(
                    "seed",
                    default=42,
                    min=0,
                    max=0xFFFFFFFFFFFFFFFF,
                    control_after_generate=True,
                    tooltip="When seed is fixed to a specific value, the model makes a best effort to provide "
                    "the same response for repeated requests. Deterministic output isn't guaranteed. "
                    "Also, changing the model or parameter settings, such as the temperature, "
                    "can cause variations in the response even when you use the same seed value. "
                    "By default, a random seed value is used.",
                ),
                IO.String.Input(
                    "system_prompt",
                    multiline=True,
                    default="",
                    optional=True,
                    tooltip="Foundational instructions that dictate an AI's behavior.",
                    advanced=True,
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
    ) -> IO.NodeOutput:
        prompt = validate_string(prompt, strip_whitespace=True)

        # Create parts list with text prompt as the first part
        parts: list[GeminiPart] = [GeminiPart(text=prompt)]

        gemini_system_prompt = None
        if system_prompt:
            gemini_system_prompt = GeminiSystemInstructionContent(parts=[GeminiTextPart(text=system_prompt)], role=None)

        response = await sync_op(
            cls,
            endpoint=ApiEndpoint(path=f"{GEMINI_BASE_ENDPOINT}/{model}:generateContent", method="POST", query_params={"key": gemini_config.gemini_api_key}),
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
