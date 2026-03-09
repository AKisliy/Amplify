from pydantic import BaseModel, Field

class CalculateMediaDurationMessage(BaseModel):
    media_path: str = Field(alias = "media_path")