from uuid import UUID
from models.broker_model import BrokerModel


class ProcessMediaCommand(BrokerModel):
    media_id: UUID
    file_key: str
    content_type: str
