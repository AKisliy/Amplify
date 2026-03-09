from typing import TypeVar
from models.envelope import Envelope

def parse_message(body: bytes, exptected_type: type) -> Envelope:
    envelope = Envelope[exptected_type].model_validate_json(body)
    return envelope