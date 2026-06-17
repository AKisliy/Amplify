"""
Node status event publisher for Temporal activities.

Publishes NodeStatusChangedEvent to RabbitMQ — same exchange and format as
the ComfyUI engine, so job_consumer.py works without modification.
"""
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel

from backend_template.utils.broker import publish_event

EXCHANGE = "node-status-changed"


class NodeStatusEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_id: str
    prompt_id: str       # reuse job_id in Temporal world
    node_id: str
    user_id: str
    status: str
    outputs: dict | None = None
    error: str | None = None
    job_status: str | None = None


async def publish_node_status(
    job_id: str,
    node_id: str,
    user_id: str,
    status: str,
    *,
    outputs: dict | None = None,
    error: str | None = None,
    job_status: str | None = None,
) -> None:
    event = NodeStatusEvent(
        job_id=job_id,
        prompt_id=job_id,
        node_id=node_id,
        user_id=user_id,
        status=status,
        outputs=outputs,
        error=error,
        job_status=job_status,
    )
    await publish_event(EXCHANGE, event)
