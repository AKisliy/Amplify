from pydantic import BaseModel, Field


class DetectSceneChangesMessage(BaseModel):
    file_path: str = Field(alias="file_path")