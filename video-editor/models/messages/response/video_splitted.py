from typing import List
from pydantic import BaseModel, Field


class VideoSplitted(BaseModel):
    parts_file_paths: List[str] = Field(alias="parts_file_paths")