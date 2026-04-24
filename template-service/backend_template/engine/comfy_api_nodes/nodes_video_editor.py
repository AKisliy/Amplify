import uuid
from typing import Any

from pydantic import BaseModel
from typing_extensions import override

from comfy_api.latest import IO, ComfyExtension
from comfy_api.latest._io import Hidden
from comfy_api_nodes.util import ApiEndpoint, sync_op, poll_op
from config import video_editor_config


# --- API response models ---

class SubmitTaskResponse(BaseModel):
    task_id: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    result: dict | None = None
    error: str | None = None


# --- Request models ---

class CaptionsSettings(BaseModel):
    font: str
    font_size: int


class MusicSettings(BaseModel):
    music_id: str
    volume: float


class TrimDecision(BaseModel):
    trim_start: float
    trim_end: float


class BaseUgcCreationArgs(BaseModel):
    format_type: str = "base-ugc"
    media_files: list[str]
    remove_silence: bool = False
    add_captions: bool = False
    captions_settings: CaptionsSettings | None = None
    add_music: bool = False
    music_settings: MusicSettings | None = None
    trim_decisions: dict[str, TrimDecision] | None = None


class SubmitTaskRequest(BaseModel):
    video_id: str
    node_id: str
    user_id: str
    creation_args: BaseUgcCreationArgs


# --- Node ---

class BaseUGCEditingNode(IO.ComfyNode):

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="BaseUGCEditingNode",
            display_name="Base UGC Editing",
            category="amplify/video editing",
            description="Merges video clips with optional silence removal, captions, and background music.",
            is_output_node=True,
            is_input_list=True,
            inputs=[
                IO.Autogrow.Input(
                    "media_files",
                    template=IO.Autogrow.TemplatePrefix(
                        IO.String.Input("media_file", force_input=True, tooltip="Media UUID of a video to include"),
                        prefix="media_file_",
                        min=1,
                        max=20,
                    ),
                    tooltip="Video files to merge in order",
                ),
                IO.Boolean.Input(
                    "remove_silence",
                    default=False,
                    tooltip="Remove silence/pauses from videos",
                ),
                IO.Boolean.Input(
                    "add_captions",
                    default=False,
                    tooltip="Add auto-generated captions to the video",
                ),
                IO.String.Input(
                    "caption_font",
                    default="Arial",
                    optional=True,
                    advanced=True,
                    tooltip="Font name for captions",
                ),
                IO.Int.Input(
                    "caption_font_size",
                    default=48,
                    min=8,
                    max=200,
                    display_mode=IO.NumberDisplay.number,
                    optional=True,
                    advanced=True,
                    tooltip="Font size for captions",
                ),
                IO.Boolean.Input(
                    "add_music",
                    default=False,
                    tooltip="Add background music to the video",
                ),
                IO.String.Input(
                    "music_id",
                    force_input=True,
                    optional=True,
                    tooltip="Audio file UUID from Media Ingest",
                ),
                IO.Int.Input(
                    "music_volume",
                    default=50,
                    min=0,
                    max=100,
                    display_mode=IO.NumberDisplay.slider,
                    optional=True,
                    advanced=True,
                    tooltip="Background music volume (0–100)",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="video_uuid"),
            ],
            hidden=[Hidden.unique_id, Hidden.extra_pnginfo],
        )

    @classmethod
    async def execute(
        cls,
        media_files: dict[str, list[str] | str],
        remove_silence: list[bool] | None = None,
        add_captions: list[bool] | None = None,
        caption_font: list[str] | None = None,
        caption_font_size: list[int] | None = None,
        add_music: list[bool] | None = None,
        music_id: list[str | None] | None = None,
        music_volume: list[int] | None = None,
    ) -> IO.NodeOutput:
        # is_input_list=True — each autogrow slot may carry a full list (from a
        # list-output node like ShotReviewNode); flatten all slots in order.
        media_list: list[str] = []
        for v in media_files.values():
            if v is None:
                continue
            if isinstance(v, list):
                media_list.extend(v)
            else:
                media_list.append(v)

        # Scalar inputs arrive as single-element lists; unwrap them.
        _remove_silence = remove_silence[0] if remove_silence else False
        _add_captions = add_captions[0] if add_captions else False
        _caption_font = caption_font[0] if caption_font else "Arial"
        _caption_font_size = caption_font_size[0] if caption_font_size else 48
        _add_music = add_music[0] if add_music else False
        _music_id = music_id[0] if music_id else None
        _music_volume = music_volume[0] if music_volume else 50

        if not media_list:
            raise ValueError("At least one media file is required")

        node_id = cls.hidden.unique_id or ""
        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        user_id = extra_pnginfo.get("client_id", "")

        raw_decisions: dict | None = extra_pnginfo.get("shot_decisions")
        trim_decisions: dict[str, TrimDecision] | None = None
        if raw_decisions:
            trim_decisions = {
                media_id: TrimDecision(
                    trim_start=v["trimStart"],
                    trim_end=v["trimEnd"],
                )
                for media_id, v in raw_decisions.items()
            }

        base_url = video_editor_config.video_editor_url

        request = SubmitTaskRequest(
            video_id=str(uuid.uuid4()),
            node_id=node_id,
            user_id=user_id,
            creation_args=BaseUgcCreationArgs(
                media_files=media_list,
                remove_silence=_remove_silence,
                add_captions=_add_captions,
                captions_settings=CaptionsSettings(
                    font=_caption_font,
                    font_size=_caption_font_size,
                ) if _add_captions else None,
                add_music=_add_music,
                music_settings=MusicSettings(
                    music_id=_music_id,
                    volume=_music_volume / 100.0,
                ) if _add_music and _music_id else None,
                trim_decisions=trim_decisions,
            ),
        )

        submit_response = await sync_op(
            cls,
            ApiEndpoint(path=f"{base_url}/tasks", method="POST"),
            response_model=SubmitTaskResponse,
            data=request,
            wait_label="Submitting video editing task...",
        )

        poll_response = await poll_op(
            cls,
            ApiEndpoint(path=f"{base_url}/tasks/{submit_response.task_id}", method="GET"),
            response_model=TaskStatusResponse,
            status_extractor=lambda r: r.status.lower(),
            completed_statuses=["success"],
            failed_statuses=["failure", "revoked"],
            queued_statuses=["pending", "received", "retry"],
            poll_interval=3.0,
            estimated_duration=120,
        )

        if poll_response.status == "FAILURE":
            raise Exception(f"Video editing failed: {poll_response.error}")

        output_media_field_name = "outputMediaId"

        output_media_id = poll_response.result[output_media_field_name]
        return IO.NodeOutput(output_media_id, ui={"video_uuid": [output_media_id]})


class BatchUGCEditingNode(IO.ComfyNode):
    """
    Merges auto-batched video clips from one or more scene branches into a single video.

    Each autogrow slot accepts the `video_uuid` output of one Veo branch.
    With is_input_list=True, ComfyUI delivers each branch's full batch as a list,
    so the node receives all clips without triggering N separate executions.

    Clips are merged in slot order — all clips from slot 1 first, then slot 2, etc.
    This gives you explicit control over scene ordering in the final video.

    Example:
        video_uuid_1 → [scene1_shot1, scene1_shot2, scene1_shot3]
        video_uuid_2 → [scene2_shot1, scene2_shot2]
        Result:        [s1_v1, s1_v2, s1_v3, s2_v1, s2_v2]
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="BatchUGCEditingNode",
            display_name="Batch UGC Editing",
            category="amplify/video editing",
            description=(
                "Merges auto-batched video clips from multiple scene branches into one video. "
                "Wire each scene's Veo video_uuid output to a separate slot. "
                "Clips are merged in slot order (scene 1 → scene 2 → …)."
            ),
            is_output_node=True,
            is_input_list=True,
            inputs=[
                IO.Autogrow.Input(
                    "scenes",
                    template=IO.Autogrow.TemplatePrefix(
                        IO.String.Input(
                            "video_uuid",
                            force_input=True,
                            tooltip="Connect a Veo node's video_uuid output. All batch clips from this scene are collected in generation order.",
                        ),
                        prefix="video_uuid_",
                        min=1,
                        max=10,
                    ),
                    tooltip=(
                        "One slot per scene branch. "
                        "All clips from slot 1 are merged before slot 2, preserving scene order."
                    ),
                ),
                IO.Boolean.Input(
                    "remove_silence",
                    default=False,
                    tooltip="Remove silence/pauses from videos",
                ),
                IO.Boolean.Input(
                    "add_captions",
                    default=False,
                    tooltip="Add auto-generated captions to the video",
                ),
                IO.String.Input(
                    "caption_font",
                    default="Arial",
                    optional=True,
                    advanced=True,
                    tooltip="Font name for captions",
                ),
                IO.Int.Input(
                    "caption_font_size",
                    default=48,
                    min=8,
                    max=200,
                    display_mode=IO.NumberDisplay.number,
                    optional=True,
                    advanced=True,
                    tooltip="Font size for captions",
                ),
                IO.Boolean.Input(
                    "add_music",
                    default=False,
                    tooltip="Add background music to the video",
                ),
                IO.String.Input(
                    "music_id",
                    force_input=True,
                    optional=True,
                    tooltip="Audio file UUID from Media Ingest",
                ),
                IO.Int.Input(
                    "music_volume",
                    default=50,
                    min=0,
                    max=100,
                    display_mode=IO.NumberDisplay.slider,
                    optional=True,
                    advanced=True,
                    tooltip="Background music volume (0–100)",
                ),
            ],
            outputs=[
                IO.String.Output(display_name="video_uuid"),
            ],
            hidden=[Hidden.unique_id, Hidden.extra_pnginfo],
        )

    @classmethod
    async def execute(
        cls,
        # is_input_list=True: each autogrow slot value arrives as a list[str] from
        # the connected Veo auto-batch. Scalar inputs arrive as single-element lists.
        scenes: dict[str, list[str] | str] | None = None,
        remove_silence: list[bool] | None = None,
        add_captions: list[bool] | None = None,
        caption_font: list[str] | None = None,
        caption_font_size: list[int] | None = None,
        add_music: list[bool] | None = None,
        music_id: list[str] | None = None,
        music_volume: list[int] | None = None,
    ) -> IO.NodeOutput:
        # Flatten scenes dict in slot order: [s1_v1, s1_v2, s1_v3, s2_v1, s2_v2, …]
        media_list: list[str] = []
        if scenes:
            for value in scenes.values():
                if isinstance(value, list):
                    media_list.extend(uid for uid in value if uid)
                elif isinstance(value, str) and value:
                    media_list.append(value)

        if not media_list:
            raise ValueError(
                "No clips found. Connect at least one Veo node's video_uuid output "
                "to a scene slot."
            )

        _remove_silence    = remove_silence[0]    if remove_silence    else False
        _add_captions      = add_captions[0]      if add_captions      else False
        _caption_font      = caption_font[0]      if caption_font      else "Arial"
        _caption_font_size = caption_font_size[0] if caption_font_size else 48
        _add_music         = add_music[0]         if add_music         else False
        _music_id          = music_id[0]          if music_id          else None
        _music_volume      = music_volume[0]      if music_volume      else 50

        node_id = cls.hidden.unique_id or ""
        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        user_id = extra_pnginfo.get("client_id", "")

        raw_decisions: dict | None = extra_pnginfo.get("shot_decisions")
        trim_decisions: dict[str, TrimDecision] | None = None
        if raw_decisions:
            trim_decisions = {
                media_id: TrimDecision(
                    trim_start=v["trimStart"],
                    trim_end=v["trimEnd"],
                )
                for media_id, v in raw_decisions.items()
            }

        base_url = video_editor_config.video_editor_url

        request = SubmitTaskRequest(
            video_id=str(uuid.uuid4()),
            node_id=node_id,
            user_id=user_id,
            creation_args=BaseUgcCreationArgs(
                media_files=media_list,
                remove_silence=_remove_silence,
                add_captions=_add_captions,
                captions_settings=CaptionsSettings(
                    font=_caption_font,
                    font_size=_caption_font_size,
                ) if _add_captions else None,
                add_music=_add_music,
                music_settings=MusicSettings(
                    music_id=_music_id,
                    volume=_music_volume / 100.0,
                ) if _add_music and _music_id else None,
                trim_decisions=trim_decisions,
            ),
        )

        submit_response = await sync_op(
            cls,
            ApiEndpoint(path=f"{base_url}/tasks", method="POST"),
            response_model=SubmitTaskResponse,
            data=request,
            wait_label="Submitting batch video editing task...",
        )

        poll_response = await poll_op(
            cls,
            ApiEndpoint(path=f"{base_url}/tasks/{submit_response.task_id}", method="GET"),
            response_model=TaskStatusResponse,
            status_extractor=lambda r: r.status.lower(),
            completed_statuses=["success"],
            failed_statuses=["failure", "revoked"],
            queued_statuses=["pending", "received", "retry"],
            poll_interval=3.0,
            estimated_duration=120,
        )

        if poll_response.status == "FAILURE":
            raise Exception(f"Video editing failed: {poll_response.error}")

        output_media_id = poll_response.result["outputMediaId"]
        return IO.NodeOutput(output_media_id, ui={"video_uuid": [output_media_id]})



class VideoEditorExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [BaseUGCEditingNode, BatchUGCEditingNode]


async def comfy_entrypoint() -> VideoEditorExtension:
    return VideoEditorExtension()
