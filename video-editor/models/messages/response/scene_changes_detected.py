from models.broker_model import BrokerModel


class SceneChangesDetected(BrokerModel):
    file_path: str
    scene_changes: list[float]
