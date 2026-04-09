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


class BaseUgcCreationArgs(BaseModel):
    format_type: str = "base-ugc"
    media_files: list[str]
    remove_silence: bool = False
    add_captions: bool = False
    captions_settings: CaptionsSettings | None = None
    add_music: bool = False
    music_settings: MusicSettings | None = None


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
        media_files: dict[str, Any],
        remove_silence: bool = False,
        add_captions: bool = False,
        caption_font: str = "Arial",
        caption_font_size: int = 48,
        add_music: bool = False,
        music_id: str | None = None,
        music_volume: int = 50,
    ) -> IO.NodeOutput:
        media_list = [v for v in media_files.values() if v is not None]
        if not media_list:
            raise ValueError("At least one media file is required")

        node_id = cls.hidden.unique_id or ""
        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        user_id = extra_pnginfo.get("client_id", "")

        base_url = video_editor_config.video_editor_url

        request = SubmitTaskRequest(
            video_id=str(uuid.uuid4()),
            node_id=node_id,
            user_id=user_id,
            creation_args=BaseUgcCreationArgs(
                media_files=media_list,
                remove_silence=remove_silence,
                add_captions=add_captions,
                captions_settings=CaptionsSettings(
                    font=caption_font,
                    font_size=caption_font_size,
                ) if add_captions else None,
                add_music=add_music,
                music_settings=MusicSettings(
                    music_id=music_id,
                    volume=music_volume / 100.0,
                ) if add_music and music_id else None,
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


class VideoEditorExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [BaseUGCEditingNode]


async def comfy_entrypoint() -> VideoEditorExtension:
    return VideoEditorExtension()
