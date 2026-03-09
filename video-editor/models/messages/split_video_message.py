from typing import List
from pydantic import BaseModel, Field


class SplitVideoMessage(BaseModel):
    video_path: str = Field(alias="video_path")