from pydantic import BaseModel, Field

class ProcessingError(BaseModel):
    error_message: str = Field(alias="error_message")
