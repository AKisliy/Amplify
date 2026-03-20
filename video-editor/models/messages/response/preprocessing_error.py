from models.broker_model import BrokerModel


class PreprocessingError(BrokerModel):
    file_path: str | None
    reason: str
