from pydantic import BaseModel, Field

class MediaConverted(BaseModel):
    output_path: str = Field(alias="output_path")
