"""
GraphWorkflow — generic DAG executor for template graphs.

Reads the ComfyUI prompt JSON format stored in template_versions, resolves
node dependencies, and dispatches Temporal activities in topological order.
Parallel-independent nodes in the same batch run concurrently via asyncio.gather.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from temporalio import activity, workflow

with workflow.unsafe.imports_passed_through():
    from backend_template.engine.comfy_execution.graph_utils import is_link
    from backend_template.temporal.registry import OUTPUT_FIELDS
    from backend_template.temporal.activities.base import NodeActivityInput
    from backend_template.temporal.activities.node import execute_node
    from backend_template.temporal.activities.status import publish_node_status

logger = logging.getLogger(__name__)

# Per-activity timeout. Veo can take ~10-20 min; 45 min is a safe ceiling.
# Heartbeat timeout: if no heartbeat for 60s, Temporal considers the activity dead.
_DEFAULT_TIMEOUT = timedelta(minutes=45)
_HEARTBEAT_TIMEOUT = timedelta(seconds=60)


# ---------------------------------------------------------------------------
# Dataclasses
# ---------------------------------------------------------------------------

@dataclass
class GraphWorkflowParams:
    job_id: str
    user_id: str
    graph_json: dict          # ComfyUI prompt format
    template_id: str = ""
    project_id: str = ""
    product_context: dict = field(default_factory=dict)


# ---------------------------------------------------------------------------
# DAG utilities
# ---------------------------------------------------------------------------

def _topological_batches(graph: dict) -> list[list[str]]:
    """Return node IDs grouped into parallel batches in dependency order."""
    deps: dict[str, set[str]] = {}
    for node_id, node_def in graph.items():
        node_deps: set[str] = set()
        for value in (node_def.get("inputs") or {}).values():
            if is_link(value):
                node_deps.add(value[0])
        deps[node_id] = node_deps

    batches: list[list[str]] = []
    completed: set[str] = set()
    while len(completed) < len(graph):
        batch = [
            nid for nid in graph
            if nid not in completed and deps[nid].issubset(completed)
        ]
        if not batch:
            raise ValueError("Circular dependency in graph")
        batches.append(batch)
        completed.update(batch)
    return batches


def _resolve_inputs(raw_inputs: dict, node_outputs: dict[str, Any], class_types: dict[str, str]) -> dict:
    """
    Replace ["node_uuid", output_index] references with actual output values.

    node_outputs values are dicts returned by execute_node (named outputs).
    OUTPUT_FIELDS maps class_type → ordered list of field names matching the
    ComfyUI ["node_uuid", index] reference scheme.
    """
    resolved: dict = {}
    for key, value in raw_inputs.items():
        if is_link(value):
            ref_node_id, output_idx = value
            ref_output = node_outputs.get(ref_node_id)        # dict or None
            ref_class = class_types.get(ref_node_id, "")
            output_fields = OUTPUT_FIELDS.get(ref_class, [])
            if ref_output is not None and output_idx < len(output_fields):
                resolved[key] = ref_output.get(output_fields[output_idx])
            else:
                resolved[key] = None
        else:
            resolved[key] = value
    return resolved


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------

@workflow.defn
class GraphWorkflow:

    @workflow.run
    async def run(self, params: GraphWorkflowParams) -> dict:
        graph: dict = params.graph_json
        class_types = {nid: node.get("class_type", "") for nid, node in graph.items()}

        # Publish JOB_STARTED
        await workflow.execute_activity(
            _publish_job_started,
            args=[params.job_id, params.user_id],
            start_to_close_timeout=timedelta(seconds=30),
        )

        node_outputs: dict[str, Any] = {}

        try:
            for batch in _topological_batches(graph):
                known = [nid for nid in batch if class_types[nid] in OUTPUT_FIELDS]
                unknown = [nid for nid in batch if class_types[nid] not in OUTPUT_FIELDS]

                if unknown:
                    logger.warning(
                        "[GraphWorkflow] job=%s: skipping unknown node types: %s",
                        params.job_id,
                        [class_types[nid] for nid in unknown],
                    )

                if not known:
                    continue

                activity_inputs = [
                    NodeActivityInput(
                        job_id=params.job_id,
                        node_id=nid,
                        user_id=params.user_id,
                        template_id=params.template_id,
                        project_id=params.project_id,
                        class_type=class_types[nid],
                        resolved=_resolve_inputs(
                            graph[nid].get("inputs") or {}, node_outputs, class_types
                        ),
                    )
                    for nid in known
                ]

                results = await asyncio.gather(*[
                    workflow.execute_activity(
                        execute_node,
                        args=[inp],
                        start_to_close_timeout=_DEFAULT_TIMEOUT,
                        heartbeat_timeout=_HEARTBEAT_TIMEOUT,
                    )
                    for inp in activity_inputs
                ])

                for nid, result in zip(known, results):
                    node_outputs[nid] = result   # dict of named outputs

        except Exception:
            await workflow.execute_activity(
                _publish_job_finished,
                args=[params.job_id, params.user_id, "FAILED"],
                start_to_close_timeout=timedelta(seconds=30),
            )
            raise

        await workflow.execute_activity(
            _publish_job_finished,
            args=[params.job_id, params.user_id, "COMPLETED"],
            start_to_close_timeout=timedelta(seconds=30),
        )

        return {}


# ---------------------------------------------------------------------------
# Tiny helper activities for job-level status events
# ---------------------------------------------------------------------------

@activity.defn
async def _publish_job_started(job_id: str, user_id: str) -> None:
    from backend_template.temporal.activities.status import publish_node_status
    await publish_node_status(job_id, "", user_id, "JOB_STARTED", job_status="PROCESSING")


@activity.defn
async def _publish_job_finished(job_id: str, user_id: str, job_status: str) -> None:
    from backend_template.temporal.activities.status import publish_node_status
    status = "JOB_COMPLETED" if job_status == "COMPLETED" else "JOB_FAILED"
    await publish_node_status(job_id, "", user_id, status, job_status=job_status)
