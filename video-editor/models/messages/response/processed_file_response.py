from pydantic import BaseModel, Field


class ProcesedFileResponse(BaseModel):
    processed_file_path : str = Field(alias="processed_file_path")