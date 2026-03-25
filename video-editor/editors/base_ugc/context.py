from dataclasses import dataclass, field

from models.creation_args.base_ugc import BaseUgcArgs
from utils.editing_workspace import EditingWorkspace


@dataclass
class EditingContext:
    video_id: str
    args: BaseUgcArgs
    workspace: EditingWorkspace
    media_urls: list[str] = field(default_factory=list)
    current_video_path: str | None = None
    srt_path: str | None = None
    output_media_id: str | None = None
