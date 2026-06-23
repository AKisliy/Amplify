"""
GraphWorkflow — generic DAG executor for template graphs.

Reads the ComfyUI prompt JSON format stored in template_versions, resolves
node dependencies, and dispatches Temporal activities in topological order.
Parallel-independent nodes in the same batch run concurrently via asyncio.gather.

HITL nodes (temporal_hitl = True) join the same concurrent batch as regular nodes.
Their flow is: hitl_setup → wait_condition (signal) → hitl_finalize.
Multiple HITL nodes in one batch all enter WAITING_FOR_REVIEW in parallel;
each unblocks independently when its hitl_complete signal arrives.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import timedelta
from typing import Any

from temporalio import activity, workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from backend_template.engine.comfy_execution.graph_utils import is_link
    from backend_template.temporal.registry import OUTPUT_FIELDS, NODE_CLASS_MAPPINGS
    from backend_template.temporal.activities.base import NodeActivityInput
    from backend_template.temporal.activities.hitl import (
        HitlFinalizeInput,
        hitl_setup,
        hitl_finalize,
    )
    from backend_template.temporal.node_policies import policy_for

logger = logging.getLogger(__name__)

_CONTEXT_PATCH_KEY = "_context_patch"
_HITL_ACTIVITY_POLICY = dict(
    start_to_close_timeout=timedelta(seconds=60),
    retry_policy=RetryPolicy(maximum_attempts=3),
)


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

def _node_deps(graph: dict) -> dict[str, set[str]]:
    """Return direct upstream node-ID dependencies for every node in the graph."""
    result: dict[str, set[str]] = {}
    for node_id, node_def in graph.items():
        deps: set[str] = set()
        for value in (node_def.get("inputs") or {}).values():
            if is_link(value):
                deps.add(value[0])
        result[node_id] = deps
    return result


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
            ref_output = node_outputs.get(ref_node_id)
            ref_class = class_types.get(ref_node_id, "")
            output_fields = OUTPUT_FIELDS.get(ref_class, [])
            if ref_output is not None and output_idx < len(output_fields):
                resolved[key] = ref_output.get(output_fields[output_idx])
            else:
                resolved[key] = None
        else:
            resolved[key] = value
    return resolved


def _is_hitl(class_type: str) -> bool:
    node_cls = NODE_CLASS_MAPPINGS.get(class_type)
    return bool(getattr(node_cls, "temporal_hitl", False)) if node_cls else False


# ---------------------------------------------------------------------------
# Workflow
# ---------------------------------------------------------------------------

@workflow.defn
class GraphWorkflow:

    def __init__(self) -> None:
        # node_id -> decision dict; populated by hitl_complete signal
        self._pending_hitl: dict[str, dict] = {}
        # Per-job accumulated execution context (replaces extra_pnginfo)
        self._exec_context: dict = {}

    @workflow.signal
    def hitl_complete(self, node_id: str, decision: dict) -> None:
        """Signal sent by ManualReviewService when a human completes a review."""
        logger.info("hitl_complete signal: node_id=%s", node_id)
        self._pending_hitl[node_id] = decision

    @workflow.run
    async def run(self, params: GraphWorkflowParams) -> dict:
        graph: dict = params.graph_json
        class_types = {nid: node.get("class_type", "") for nid, node in graph.items()}

        await workflow.execute_activity(
            _publish_job_started,
            args=[params.job_id, params.user_id],
            start_to_close_timeout=timedelta(seconds=30),
        )

        node_outputs: dict[str, Any] = {}

        deps = _node_deps(graph)
        # Per-node completion event: set when the node's result is stored.
        node_done: dict[str, asyncio.Event] = {nid: asyncio.Event() for nid in graph}

        known_nids = [nid for nid in graph if class_types[nid] in OUTPUT_FIELDS]
        unknown_nids = [nid for nid in graph if class_types[nid] not in OUTPUT_FIELDS]
        if unknown_nids:
            logger.warning(
                "[GraphWorkflow] job=%s: skipping unknown node types: %s",
                params.job_id,
                [class_types[nid] for nid in unknown_nids],
            )
        # Unknown nodes have no outputs — mark them done so dependents don't hang.
        for nid in unknown_nids:
            node_done[nid].set()

        async def run_node(nid: str) -> None:
            # Wait for every direct upstream dependency to finish.
            for dep in deps[nid]:
                if dep in node_done:
                    await node_done[dep].wait()

            logger.info("[GraphWorkflow] job=%s starting node %s (%s)", params.job_id, nid, class_types[nid])
            inp = NodeActivityInput(
                job_id=params.job_id,
                node_id=nid,
                user_id=params.user_id,
                template_id=params.template_id,
                project_id=params.project_id,
                class_type=class_types[nid],
                resolved=_resolve_inputs(
                    graph[nid].get("inputs") or {}, node_outputs, class_types
                ),
                can_use_cache=graph[nid].get("_meta", {}).get("can_use_cache", False),
                exec_context=dict(self._exec_context),
            )

            if _is_hitl(class_types[nid]):
                result = await self._run_hitl_node(nid, inp)
            else:
                result = await workflow.execute_activity(
                    class_types[nid], args=[inp], **policy_for(class_types[nid])
                )

            node_outputs[nid] = result
            if isinstance(result, dict):
                patch = result.get(_CONTEXT_PATCH_KEY)
                if patch:
                    self._exec_context.update(patch)
            node_done[nid].set()

        try:
            await asyncio.gather(*[run_node(nid) for nid in known_nids])

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

    async def _run_hitl_node(self, nid: str, inp: NodeActivityInput) -> dict:
        """Full HITL flow for a single node: setup → (wait signal) → finalize."""
        setup_result = await workflow.execute_activity(
            hitl_setup, args=[inp], **_HITL_ACTIVITY_POLICY
        )

        if setup_result.is_cached:
            return setup_result.cached_value

        if not setup_result.auto_confirmed:
            await workflow.wait_condition(lambda: nid in self._pending_hitl)
            decision = self._pending_hitl.pop(nid)
        else:
            decision = {}

        finalize_inp = HitlFinalizeInput(
            inp=inp,
            decision=decision,
            cache_key=setup_result.cache_key,
        )
        return await workflow.execute_activity(
            hitl_finalize, args=[finalize_inp], **_HITL_ACTIVITY_POLICY
        )


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
