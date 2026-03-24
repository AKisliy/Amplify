from typing import List
from models.broker_model import BrokerModel


class VideoHashCalculated(BrokerModel):
    similar_file_id: str | None
    frame_hashes: List[str]
    frame_numbers: List[int]
