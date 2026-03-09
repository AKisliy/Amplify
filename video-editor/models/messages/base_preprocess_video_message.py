from pydantic import BaseModel, Field
from models.enum.file_type import FileType


class BasePrepocessVideoMessage(BaseModel):
    file_path: str = Field(alias="file_path")
    file_type: FileType = Field(alias="file_type")