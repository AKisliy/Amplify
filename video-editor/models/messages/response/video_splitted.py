from typing import List
from models.broker_model import BrokerModel


class VideoSplitted(BrokerModel):
    parts_file_paths: List[str]
