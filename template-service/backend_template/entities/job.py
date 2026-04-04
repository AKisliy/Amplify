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
