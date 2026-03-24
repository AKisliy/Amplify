from models.broker_model import BrokerModel


class CalculateMediaDurationMessage(BrokerModel):
    media_path: str
