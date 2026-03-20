from models.broker_model import BrokerModel
from models.enum.media_type import MediaType


class ExtractDownloadLinkMessage(BrokerModel):
    media_link: str
    media_type: MediaType
