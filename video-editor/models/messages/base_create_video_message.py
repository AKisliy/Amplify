from pydantic import BaseModel, Field
from typing import Dict, Any

from models.enum.video_format import VideoFormat

class BaseCreateVideoMessage(BaseModel):
    video_id: str = Field(alias="video_id")
    video_format: VideoFormat = Field(alias="video_format")
    creation_args: Dict[str, Any]
