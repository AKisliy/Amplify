"""
Per-node Temporal scheduling policies.

Retry policies and timeouts are set at the workflow call site (workflow.execute_activity),
not in the activity definition, so a single dynamic activity handler still supports
per-type configuration.

To customise a node's policy, add a class-level attribute to the node class:

    class VeoVideoGenerationNode(IO.ComfyNode):
        temporal_policy = {
            "start_to_close_timeout": timedelta(minutes=90),
            "retry_policy": RetryPolicy(maximum_attempts=2),
        }

Unspecified keys fall back to DEFAULT_POLICY. Nodes without temporal_policy use
DEFAULT_POLICY as-is.
"""
from __future__ import annotations

from datetime import timedelta
import logging

from temporalio.common import RetryPolicy

logger = logging.getLogger(__name__)

DEFAULT_POLICY: dict = dict(
    start_to_close_timeout=timedelta(minutes=45),
    heartbeat_timeout=timedelta(seconds=60),
    retry_policy=RetryPolicy(maximum_attempts=3),
)


def policy_for(class_type: str) -> dict:
    """Return the merged scheduling policy for a node class type."""
    from backend_template.temporal.registry import NODE_CLASS_MAPPINGS  # lazy — avoids circular import

    node_cls = NODE_CLASS_MAPPINGS.get(class_type)
    override = getattr(node_cls, "temporal_policy", {}) if node_cls else {}
    if override:
        logger.info("Found override policy for %s, using it - %s", node_cls, override)
    return {**DEFAULT_POLICY, **override}
