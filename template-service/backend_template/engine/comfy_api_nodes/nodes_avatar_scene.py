"""
AvatarSceneNode — Super-Node for Ambassador Scene Generation

Generates a full video scene from:
  • The ambassador associated with the current project (auto-resolved from
    execution context — no user input required)
  • A first-frame image (Media Ingest UUID)
  • A scene transcript

Pipeline
--------
1. Read ``project_id`` from execution context (``extra_pnginfo``).
2. Fetch the ambassador for that project → get ``appearance_description`` /
   ``voice_description``.
3. Compile the Langfuse ``shared/transcript_processor`` prompt with the
   transcript and call Gemini → receive structured segments
   [{script_segment, duration_seconds}].
4. For each segment compile the Langfuse ``template/veo_solo`` prompt
   (ambassador appearance + script + voice) and generate a Veo video clip
   conditioned on the first-frame image.

Outputs a list of video media_ids (one per segment).
"""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

from comfy_api.latest import IO, ComfyExtension
from comfy_api.latest._io import Hidden
from typing_extensions import override

from comfy_api_nodes.apis.gemini import (
    GeminiContent,
    GeminiGenerateContentRequest,
    GeminiGenerateContentResponse,
    GeminiGenerationConfig,
    GeminiPart,
    GeminiRole,
    GeminiTextPart,
)
from comfy_api_nodes.apis.veo import (
    VeoGenVidPollRequest,
    VeoGenVidPollResponse,
    VeoGenVidRequest,
    VeoGenVidResponse,
    VeoRequestInstanceImage,
    VeoRequestParameters,
    VeoRequestInstance
)
from comfy_api_nodes.util import (
    ApiEndpoint,
    fetch_media_uri_from_ingest,
    get_vertex_ai_access_token,
    poll_op,
    register_media_uri_with_ingest,
    sync_op,
)
from config import gemini_config

logger = logging.getLogger(__name__)

# ── Constants ─────────────────────────────────────────────────────────

GEMINI_BASE_ENDPOINT = (
    f"https://aiplatform.googleapis.com/v1/projects/{gemini_config.project_id}"
    f"/locations/{gemini_config.location}/publishers/google/models"
)

AVERAGE_DURATION_VIDEO_GEN = 32  # seconds — for progress estimation

MODELS_MAP = {
    "veo-3.1-generate": "veo-3.1-generate-001",
    "veo-3.1-fast-generate": "veo-3.1-fast-generate-001",
    "veo-3.0-generate-001": "veo-3.0-generate-001",
    "veo-3.0-fast-generate-001": "veo-3.0-fast-generate-001",
}

# Fallback JSON schema for transcript segmentation used when the Langfuse
# prompt does not carry its own schema in the config.
_TRANSCRIPT_SCHEMA = {
    "type": "object",
    "properties": {
        "segments": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "script_segment": {"type": "string"},
                    "duration_seconds": {"type": "integer"},
                },
                "required": ["script_segment", "duration_seconds"],
            },
        }
    },
    "required": ["segments"],
}


# ── Helpers ───────────────────────────────────────────────────────────


def _get_langfuse_client():
    from langfuse import get_client
    return get_client()


async def _compile_langfuse_prompt(name: str, variables: dict[str, str]) -> tuple[str, str]:
    """Fetch a Langfuse text prompt, compile template variables, and return
    ``(compiled_text, schema_json_str)``.  ``schema_json_str`` is empty when
    the prompt carries no structured-output schema."""
    client = _get_langfuse_client()

    def _fetch():
        return client.get_prompt(name, label="production", type="text")

    prompt = await asyncio.to_thread(_fetch)
    compiled: str = prompt.compile(**variables)

    schema_str = ""
    config = getattr(prompt, "config", None) or {}
    if isinstance(config, dict):
        schema_obj = config.get("schema")
        if schema_obj is None:
            rf = config.get("response_format", {})
            if isinstance(rf, dict):
                js = rf.get("json_schema", {})
                if isinstance(js, dict):
                    schema_obj = js.get("schema")
        if schema_obj is not None:
            schema_str = json.dumps(schema_obj)

    return compiled, schema_str


def _extract_segments(json_text: str) -> list[dict]:
    parsed = json.loads(json_text)
    if isinstance(parsed, list):
        return parsed
    if isinstance(parsed, dict):
        for value in parsed.values():
            if isinstance(value, list):
                return value
    return []


# ── Node ──────────────────────────────────────────────────────────────


class AvatarSceneNode(IO.ComfyNode):
    """Generates a full ambassador scene from a first-frame image and a scene
    transcript.

    The ambassador is resolved automatically from the project associated with
    the current template execution — no ``ambassador_id`` input needed.

    Steps
    -----
    1. Reads ``project_id`` from the execution context (``extra_pnginfo``).
    2. Fetches the project's ambassador → ``appearance_description`` /
       ``voice_description``.
    3. Compiles ``shared/transcript_processor`` + calls Gemini → structured
       segments ``[{script_segment, duration_seconds}]``.
    4. For each segment compiles ``template/veo_solo`` and generates a Veo
       video clip conditioned on the first-frame image.

    Outputs a list of video ``media_id`` strings — one per segment.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="AvatarSceneNode",
            display_name="Avatar Scene (Super Node)",
            category="api node/video/Ambassador",
            description=(
                "Generates a full ambassador scene from a first-frame image and a "
                "transcript. The ambassador is resolved automatically from the current "
                "project. Internally splits the transcript via Gemini and generates a "
                "Veo video clip per segment."
            ),
            is_output_node=True,
            hidden=[Hidden.unique_id, Hidden.extra_pnginfo],
            inputs=[
                IO.String.Input(
                    "media_uuid",
                    force_input=True,
                    tooltip="Media Ingest UUID of the first-frame image for the scene.",
                ),
                IO.String.Input(
                    "transcript",
                    multiline=True,
                    tooltip="Full scene transcript to be split into video segments.",
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["16:9", "9:16"],
                    default="16:9",
                    tooltip="Aspect ratio of the output videos.",
                ),
                IO.Combo.Input(
                    "veo_model",
                    options=[
                        "veo-3.1-generate",
                        "veo-3.1-fast-generate",
                        "veo-3.0-generate-001",
                        "veo-3.0-fast-generate-001",
                    ],
                    default="veo-3.0-generate-001",
                    tooltip="Veo 3 model used for video generation.",
                    optional=True,
                ),
                IO.Combo.Input(
                    "gemini_model",
                    options=[
                        "gemini-2.5-flash-preview-04-17",
                        "gemini-2.5-pro-preview-05-06",
                        "gemini-2.5-flash",
                        "gemini-2.5-pro",
                    ],
                    default="gemini-2.5-flash-preview-04-17",
                    tooltip="Gemini model used for transcript segmentation.",
                    optional=True,
                ),
            ],
            outputs=[
                IO.String.Output(
                    display_name="video_uuids",
                    is_output_list=True,
                    tooltip="Generated video media_ids — one per transcript segment.",
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        media_uuid: str,
        transcript: str,
        aspect_ratio: str = "16:9",
        veo_model: str = "veo-3.0-generate-001",
        gemini_model: str = "gemini-2.5-flash-preview-04-17",
    ) -> IO.NodeOutput:
        veo_model = MODELS_MAP[veo_model]
        # ── 1. Resolve project → ambassador ──────────────────────────────
        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        logger.info("[AvatarSceneNode] extra_pnginfo=%r", extra_pnginfo)
        project_id_str: str = extra_pnginfo.get("project_id", "")
        if not project_id_str:
            raise ValueError(
                "project_id not found in execution context. "
                "Ensure the template is run via the JobService."
            )

        from backend_template.database import async_session_maker
        from backend_template.repositories.ambassador import AmbassadorRepository

        logger.info("[AvatarSceneNode] Looking up ambassador for project %s", project_id_str)
        async with async_session_maker() as session:
            repo = AmbassadorRepository(session)
            ambassador = await repo.get_by_project_id(UUID(project_id_str))

        if ambassador is None:
            raise ValueError(
                f"No ambassador found for project {project_id_str!r}. "
                "Create an ambassador for this project first."
            )

        appearance: str = ambassador.appearance_description or ""
        voice: str = ambassador.voice_description or ""
        logger.info(
            "[AvatarSceneNode] Ambassador %r — appearance=%d chars, voice=%d chars",
            ambassador.name,
            len(appearance),
            len(voice),
        )

        # ── 2. Split transcript into timed segments ───────────────────────
        logger.info("[AvatarSceneNode] Compiling transcript_processor prompt")
        transcript_prompt, schema_str = await _compile_langfuse_prompt(
            "_shared/transcript_processor",
            {"script": transcript},
        )

        schema_dict = json.loads(schema_str) if schema_str else _TRANSCRIPT_SCHEMA
        generation_config = GeminiGenerationConfig(
            responseMimeType="application/json",
            responseSchema=schema_dict,
        )

        logger.info(
            "[AvatarSceneNode] Calling Gemini (%s) for transcript segmentation", gemini_model
        )
        gemini_response: GeminiGenerateContentResponse = await sync_op(
            cls,
            ApiEndpoint(
                path=f"{GEMINI_BASE_ENDPOINT}/{gemini_model}:generateContent",
                method="POST",
                headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"},
            ),
            response_model=GeminiGenerateContentResponse,
            data=GeminiGenerateContentRequest(
                contents=[
                    GeminiContent(
                        role=GeminiRole.user,
                        parts=[GeminiPart(text=transcript_prompt, inlineData=None, fileData=None)],
                    )
                ],
                generationConfig=generation_config,
                safetySettings=None,
                systemInstruction=None,
                tools=None,
                videoMetadata=None
            ),
        )

        raw_json = ""
        if gemini_response.candidates:
            for candidate in gemini_response.candidates:
                if candidate.content and candidate.content.parts:
                    for part in candidate.content.parts:
                        if part.text:
                            raw_json += part.text

        try:
            segments = _extract_segments(raw_json)
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValueError(
                f"Gemini returned invalid JSON for transcript segmentation: {exc}\n"
                f"Response: {raw_json}"
            ) from exc

        if not segments:
            raise ValueError("Transcript segmentation returned no segments.")

        logger.info("[AvatarSceneNode] Received %d segment(s) from Gemini", len(segments))

        # ── 3. Generate a Veo clip per segment ───────────────────────────
        # Pre-fetch the GCS URI once — reused for all segment clips.
        gcs_uri = await fetch_media_uri_from_ingest(cls, media_uuid)

        video_uuids: list[str] = []

        for i, seg in enumerate(segments):
            script_segment: str = seg.get("script_segment", "")

            logger.info(
                "[AvatarSceneNode] Segment %d/%d — script=%d chars",
                i + 1, len(segments), len(script_segment),
            )

            veo_prompt, _ = await _compile_langfuse_prompt(
                "template/veo_solo",
                {
                    "avatar_description": appearance,
                    "script": script_segment,
                    "avatar_voice_description": voice,
                },
            )

            initial_response: VeoGenVidResponse = await sync_op(
                cls,
                ApiEndpoint(
                    path=f"{GEMINI_BASE_ENDPOINT}/{veo_model}:predictLongRunning",
                    method="POST",
                    headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"},
                ),
                response_model=VeoGenVidResponse,
                data=VeoGenVidRequest(
                    instances=[VeoRequestInstance(
                        prompt=veo_prompt,
                        image=VeoRequestInstanceImage(gcsUri=gcs_uri, mimeType="image/png", bytesBase64Encoded=None),
                        lastFrame=None)],
                    parameters=VeoRequestParameters(
                        aspectRatio=aspect_ratio,
                        personGeneration="ALLOW",
                        durationSeconds=8,
                        enhancePrompt=True,
                        storageUri=gemini_config.storage_uri,
                        generateAudio=True,
                        resolution=None
                    ),
                ),
            )

            poll_response: VeoGenVidPollResponse = await poll_op(
                cls,
                ApiEndpoint(
                    path=f"{GEMINI_BASE_ENDPOINT}/{veo_model}:fetchPredictOperation",
                    method="POST",
                    headers={"Authorization": f"Bearer {get_vertex_ai_access_token()}"},
                ),
                response_model=VeoGenVidPollResponse,
                status_extractor=lambda r: "completed" if r.done else "pending",
                data=VeoGenVidPollRequest(operationName=initial_response.name),
                poll_interval=5.0,
                estimated_duration=AVERAGE_DURATION_VIDEO_GEN,
            )

            if poll_response.error:
                raise Exception(
                    f"Veo error on segment {i + 1}: {poll_response.error.message} "
                    f"(code: {poll_response.error.code})"
                )

            response = poll_response.response
            filtered = getattr(response, "raiMediaFilteredCount", 0) or 0
            if filtered:
                reasons = getattr(response, "raiMediaFilteredReasons", []) or []
                reason_part = f": {reasons[0]}" if reasons else ""
                raise Exception(
                    f"Segment {i + 1} blocked by Google's Responsible AI filters{reason_part}."
                )

            if response and getattr(response, "videos", None):
                video = response.videos[0]
                if video.gcsUri:
                    media_id = await register_media_uri_with_ingest(cls, video.gcsUri, "video/mp4")
                    video_uuids.append(media_id)
                    logger.info(
                        "[AvatarSceneNode] Segment %d done — media_id=%s", i + 1, media_id
                    )
                    continue

            raise Exception(f"No video returned for segment {i + 1}.")

        logger.info("[AvatarSceneNode] All %d segment(s) generated", len(video_uuids))
        return IO.NodeOutput(video_uuids)


# ── Extension & Entry Point ───────────────────────────────────────────


class AvatarSceneExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [AvatarSceneNode]


async def comfy_entrypoint() -> AvatarSceneExtension:
    return AvatarSceneExtension()
