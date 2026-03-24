from models.broker_model import BrokerModel
from models.enum.media_constraints import MediaConstraints


class ConvertFileToConstraintsMessage(BrokerModel):
    media_path: str
    output_path: str
    constraints: MediaConstraints
