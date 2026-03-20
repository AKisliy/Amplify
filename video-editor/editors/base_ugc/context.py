from dataclasses import dataclass, field

from models.creation_args.base_ugc import BaseUgcArgs
from utils.editing_workspace import EditingWorkspace


@dataclass
class EditingContext:
    video_id: str
    args: BaseUgcArgs
    workspace: EditingWorkspace
    local_media_paths: list[str] = field(default_factory=list) 
    current_video_path: str | None = None 
    output_path: str | None = None                
