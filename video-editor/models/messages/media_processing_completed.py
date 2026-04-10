from typing import Optional
from models.broker_model import BrokerModel


class MediaProcessingCompleted(BrokerModel):
    media_id: str
    success: bool
    thumb_tiny_key: Optional[str] = None
    thumb_medium_key: Optional[str] = None
    error: Optional[str] = None
