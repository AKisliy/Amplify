from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel


class RunTemplateRequest(BaseModel):
    template_id: UUID


class RunTemplateResponse(BaseModel):
    job_id: str
    prompt_id: str


class NodeStatusChangedEvent(BaseModel):
    """Published to RabbitMQ exchange 'node-status-changed'."""

    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_id: str
    prompt_id: str
    node_id: str
    user_id: str
    status: str  # RUNNING | SUCCESS | FAILURE | CACHED
    outputs: dict | None = None
    error: str | None = None
    job_status: str | None = None  # COMPLETED | FAILED — set on terminal events


# ---------------------------------------------------------------------------
# Job Detail (GET /v1/engine/jobs/{job_id})
# ---------------------------------------------------------------------------
class NodeExecutionResponse(BaseModel):
    """Single node's execution state within a job."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    node_id: UUID
    class_name: str
    status: str
    inputs: dict | None = None
    outputs: dict | None = None
    error_message: str | None = None
    created_at: datetime
    updated_at: datetime


class JobDetailResponse(BaseModel):
    """Full job details including per-node execution state."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    prompt_id: str | None = None
    total_cost: float
    template_version_id: UUID
    started_at: datetime | None = None
    finished_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
    node_executions: list[NodeExecutionResponse] = []

