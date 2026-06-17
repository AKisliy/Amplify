"""Shared input type for all Temporal node activities."""
from __future__ import annotations

from dataclasses import dataclass, field


@dataclass
class NodeActivityInput:
    """
    Generic activity input — mirrors how ComfyUI calls execute(**resolved_inputs).

    ctx fields (job_id, node_id, class_type, ...) are injected by the workflow.
    resolved contains the raw graph inputs with node-reference links already resolved,
    keyed by the same names used in the node's define_schema() inputs.
    """
    job_id: str
    node_id: str
    user_id: str
    template_id: str
    project_id: str
    class_type: str = ""
    resolved: dict = field(default_factory=dict)
