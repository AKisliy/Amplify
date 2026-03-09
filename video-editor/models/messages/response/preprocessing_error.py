from pydantic import BaseModel, Field


class PreprocessingError(BaseModel):
    file_path: str | None = Field(alias="file_path")
    reason: str = Field("reason")