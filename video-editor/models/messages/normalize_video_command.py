from uuid import UUID
from pydantic import BaseModel, Field


class NormalizeVideoCommand(BaseModel):
    model_config = {"populate_by_name": True}

    media_id: UUID = Field(alias="mediaId")
    file_key: str = Field(alias="fileKey")
