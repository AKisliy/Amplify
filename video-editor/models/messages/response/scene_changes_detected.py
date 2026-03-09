from pydantic import BaseModel, Field


class SceneChangesDetected(BaseModel):
    file_path: str = Field(alias="file_path")
    scene_changes: list[float] = Field(alias="scene_changes")