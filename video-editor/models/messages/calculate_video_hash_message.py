from pydantic import BaseModel, Field


class CalculateVideoHashMessage(BaseModel):
    video_path: str = Field(alias = "video_path")