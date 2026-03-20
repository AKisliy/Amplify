from uuid import UUID
from models.broker_model import BrokerModel


class NormalizeVideoCommand(BrokerModel):
    media_id: UUID
    file_key: str
