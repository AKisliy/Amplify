from typing import Literal

from models.broker_model import BrokerModel

EditingStepStatus = Literal["in_progress", "completed", "failed"]


class VideoEditingStepChanged(BrokerModel):
    video_id: str
    node_id: str
    user_id: str
    step: str
    status: EditingStepStatus
    error: str | None = None
