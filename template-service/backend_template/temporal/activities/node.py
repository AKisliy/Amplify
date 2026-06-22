"""
Dynamic Temporal activity: routes to the correct node class by activity type name.

The workflow schedules activities using the node's class_type string as the
activity name (e.g. "GeminiNode", "VeoVideoGenerationNode").  Temporal routes
any unmatched name to the single dynamic handler here, which reads the name
from activity.info().activity_type and dispatches to NODE_CLASS_MAPPINGS.

Benefit: each node class_type appears as a separate activity type in the
Temporal UI, enabling per-type retry policies and timeout configuration,
without registering N separate activity functions at startup.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import suppress
from collections.abc import Sequence

from temporalio import activity
from temporalio.common import RawValue

from backend_template.config import settings
from backend_template.temporal.activities.base import NodeActivityInput
from backend_template.temporal.activities.status import publish_node_status
from backend_template.temporal.cache import compute_cache_key, get_cached, set_cached
from backend_template.temporal.registry import NODE_CLASS_MAPPINGS

logger = logging.getLogger(__name__)


def _preprocess_resolved(node_cls: type, resolved: dict) -> dict:
    """
    Aggregate IO.Autogrow inputs before calling execute().

    ComfyUI v3 stores autogrow items in the graph JSON using dot-notation keys
    (e.g. "media_files.media_file_0").  build_nested_inputs converts them back
    to the nested dict structure that execute() expects (e.g. media_files={...}).
    """
    from comfy_api.latest._io import build_nested_inputs, get_finalized_class_inputs
    try:
        valid_inputs = node_cls.INPUT_TYPES()
        _, _, v3_data = get_finalized_class_inputs(valid_inputs, resolved)
        return build_nested_inputs(dict(resolved), v3_data)
    except Exception:
        return resolved


@activity.defn(dynamic=True)
async def execute_node(input_args: Sequence[RawValue]) -> dict:
    """
    Dynamic activity — handles all graph node class types.

    activity.info().activity_type is the node's class_type string (e.g. "GeminiNode").
    Temporal routes any activity name not explicitly registered here, so the workflow
    can schedule activities by class_type without registering a function per type.
    """
    from comfy_api_nodes.util.client import set_litellm_context  # engine/ on sys.path

    class_type = activity.info().activity_type
    inp: NodeActivityInput = activity.payload_converter().from_payload(
        input_args[0].payload, NodeActivityInput
    )

    node_cls = NODE_CLASS_MAPPINGS[class_type]

    # --- Cache read (only if node is in UI cache zone AND globally enabled) ---
    cache_key = compute_cache_key(class_type, inp.resolved)
    if inp.can_use_cache and settings.cache_enabled:
        cached = await get_cached(cache_key)
        if cached is not None:
            logger.info("Cache hit: %s node_id=%s", class_type, inp.node_id)
            await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "CACHED")
            return cached

    set_litellm_context(inp.template_id, inp.project_id, inp.job_id)
    await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "RUNNING")

    async def _heartbeat_loop() -> None:
        while True:
            activity.heartbeat("running")
            await asyncio.sleep(30)

    heartbeat_task = asyncio.create_task(_heartbeat_loop())
    try:
        resolved = _preprocess_resolved(node_cls, inp.resolved)
        result = await node_cls.execute(**resolved)

        schema = node_cls.define_schema()
        outputs: dict = {}
        for i, out in enumerate(schema.outputs):
            try:
                outputs[out.display_name] = result[i]
            except (IndexError, TypeError):
                outputs[out.display_name] = None

        await publish_node_status(
            inp.job_id, inp.node_id, inp.user_id, "SUCCESS",
            outputs={
                k: v if isinstance(v, list) else [v]
                for k, v in outputs.items()
            },
        )

        # --- Cache write (every run, if globally enabled) ---
        if settings.cache_enabled:
            await set_cached(cache_key, class_type, outputs)

        return outputs

    except Exception as exc:
        await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "FAILURE", error=str(exc))
        raise
    finally:
        heartbeat_task.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat_task
