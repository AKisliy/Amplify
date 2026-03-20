from models.broker_model import BrokerModel


class CalculateVideoHashMessage(BrokerModel):
    video_path: str
