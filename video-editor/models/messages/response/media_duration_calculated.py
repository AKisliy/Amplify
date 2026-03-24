from models.broker_model import BrokerModel


class MediaDurationCalculated(BrokerModel):
    media_path: str
    duration: float
