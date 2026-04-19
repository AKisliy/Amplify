from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


def _cc() -> ConfigDict:
    return ConfigDict(alias_generator=to_camel, populate_by_name=True, from_attributes=True)


class ManualReviewTaskResponse(BaseModel):
    model_config = _cc()

    id: UUID
    job_id: UUID
    node_id: UUID
    node_type: str
    status: str
    auto_confirm: bool
    payload: dict
    decision: dict | None = None


class ManualReviewCompleteRequest(BaseModel):
    model_config = _cc()

    decision: dict


class ManualReviewCreateRequest(BaseModel):
    """Called internally by the node (not exposed to the public API)."""
    model_config = _cc()

    job_id: UUID
    node_id: UUID
    node_type: str
    auto_confirm: bool = False
    payload: dict = {}
