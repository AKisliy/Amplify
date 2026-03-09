from typing import List
from pydantic import BaseModel, Field


class VideoHashCalculated(BaseModel):
    similar_file_id: str | None = Field(alias="similar_file_id")
    frame_hashes: List[str] = Field(alias="frame_hashes")
    frame_numbers : List[int] = Field(alias="frame_numbers")
