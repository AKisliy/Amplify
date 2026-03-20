from typing import Literal, Union
from pydantic import BaseModel, Field


EditingStepStatus = Literal["in_progress", "completed", "failed"]


class VideoEditingStepChanged(BaseModel):
    video_id: str = Field(alias="video_id")
    node_id: str = Field(alias="node_id")
    user_id: str = Field(alias="user_id")
    step: str = Field(alias="step")
    status: EditingStepStatus = Field(alias="status")
    error: str | None = Field(default=None, alias="error")
