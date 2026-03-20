from models.broker_model import BrokerModel


class VideoGenerated(BrokerModel):
    video_id: str
    status: str
    output_path: str
    error: str
