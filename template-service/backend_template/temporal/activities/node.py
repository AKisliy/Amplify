"""
Generic Temporal activity: execute_node.

Mirrors how ComfyUI's executor calls node.execute(**resolved_inputs) —
the node class knows its own contract; this activity is just a runner.

Adding a new node type requires only a line in registry.NODE_CLASS_MAPPINGS.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import suppress

from temporalio import activity

from backend_template.temporal.activities.base import NodeActivityInput
from backend_template.temporal.activities.status import publish_node_status
from backend_template.temporal.registry import NODE_CLASS_MAPPINGS

logger = logging.getLogger(__name__)


def _preprocess_resolved(node_cls: type, resolved: dict) -> dict:
    """
    Aggregate IO.Autogrow.TemplatePrefix inputs before calling execute().

    In the graph JSON, autogrow items are stored as individual keys
    (e.g. image_uuid_1, image_uuid_2).  ComfyUI's executor groups them into a
    single dict keyed by the autogrow input name (e.g. images={...}).
    We replicate that aggregation here by inspecting define_schema().inputs.
    """
    try:
        schema = node_cls.define_schema()
    except Exception:
        return resolved

    result = dict(resolved)
    for inp in schema.inputs:
        template = getattr(inp, "template", None)
        prefix = getattr(template, "prefix", None)
        inp_name = getattr(inp, "name", None)
        if prefix and inp_name and inp_name not in result:
            items = {k: v for k, v in resolved.items() if k.startswith(prefix) and v}
            result[inp_name] = items if items else None
            for k in items:
                result.pop(k, None)
    return result


@activity.defn
async def execute_node(inp: NodeActivityInput) -> dict:
    """
    Execute a single graph node as a Temporal activity.

    Wraps any IO.ComfyNode subclass: sets LiteLLM cost context, heartbeats
    Temporal every 30 s during long-running polls, publishes RUNNING/SUCCESS/FAILURE
    status events, and returns a dict of named outputs matching OUTPUT_FIELDS order.
    """
    from comfy_api_nodes.util.client import set_litellm_context  # bare import via engine/ on sys.path

    node_cls = NODE_CLASS_MAPPINGS[inp.class_type]

    # Inject cost-tracking context so sync_op/poll_op requests carry spend_logs_metadata
    set_litellm_context(inp.template_id, inp.project_id, inp.job_id)

    await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "RUNNING")

    async def _heartbeat_loop() -> None:
        """Keep Temporal informed that the activity is alive during long polls."""
        while True:
            activity.heartbeat("running")
            await asyncio.sleep(30)

    heartbeat_task = asyncio.create_task(_heartbeat_loop())
    try:
        resolved = _preprocess_resolved(node_cls, inp.resolved)
        result = await node_cls.execute(**resolved)

        # Map NodeOutput positional args → named outputs via schema order
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
        return outputs

    except Exception as exc:
        await publish_node_status(
            inp.job_id, inp.node_id, inp.user_id, "FAILURE", error=str(exc)
        )
        raise
    finally:
        heartbeat_task.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat_task
