from pydantic import BaseModel, Field


class DirectDownloadLinkExtracted(BaseModel):
    direct_download_link : str = Field(alias="direct_download_link")