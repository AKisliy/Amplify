from pydantic import BaseModel, Field


class MediaDurationCalculated(BaseModel):
    media_path: str = Field(alias = "media_path")
    duration: float = Field(alias = "duration")