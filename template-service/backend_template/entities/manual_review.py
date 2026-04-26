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


# ── Script Supervisor regeneration entities ───────────────────────────────────


class VeoEditableParams(BaseModel):
    """Editable Veo generation params surfaced to the user during script review.

    All fields can be modified before re-generating a single shot.
    Locked fields (first_frame_uuid, last_frame_uuid) are read from the task
    payload server-side — they are never sent over the wire by the client.
    """

    model_config = _cc()

    prompt: str
    negative_prompt: str = ""
    resolution: str = "720p"       # "720p" | "1080p"
    aspect_ratio: str = "16:9"     # "16:9" | "9:16"
    duration: int = 8              # allowed: 4, 6, or 8
    model: str = "veo-3.1-lite-generate-001"


class ShotRegenerateRequest(BaseModel):
    """Body for POST /review/{task_id}/regenerate-shot."""

    model_config = _cc()

    slot_index: int
    params: VeoEditableParams
