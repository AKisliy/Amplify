from pydantic import BaseModel, Field

from models.enum.media_constraints import MediaConstraints


class ConvertFileToConstraintsMessage(BaseModel):
    media_path: str = Field(alias = "media_path")
    output_path: str = Field(alias="output_path")
    constraints: MediaConstraints = Field(alias="constraints")