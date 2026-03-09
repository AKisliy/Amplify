from pydantic import BaseModel, Field

class VideoGenerated(BaseModel):
    video_id: str = Field(alias="video_id")
    status: str = Field(alias="status")
    output_path: str = Field("output_path")
    error: str = Field("error")