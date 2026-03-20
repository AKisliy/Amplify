from typing import TypeVar

from models.envelope import Envelope

T = TypeVar("T")


def parse_message(body: bytes, expected_type: type[T]) -> T:
    return expected_type.model_validate_json(body)


def parse_envelope(body: bytes, expected_type: type[T]) -> Envelope:
    return Envelope[expected_type].model_validate_json(body)
