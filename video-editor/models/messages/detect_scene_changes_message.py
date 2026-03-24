from models.broker_model import BrokerModel


class DetectSceneChangesMessage(BrokerModel):
    file_path: str
