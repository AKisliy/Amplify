from pydantic import BaseModel, Field

from models.enum.media_type import MediaType


class ExtractDownloadLinkMessage(BaseModel):
    media_link: str = Field(alias="media_link")
    media_type: MediaType = Field(alias="media_type")