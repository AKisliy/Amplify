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
        return outputs

    except Exception as exc:
        await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "FAILURE", error=str(exc))
        raise
    finally:
        heartbeat_task.cancel()
        with suppress(asyncio.CancelledError):
            await heartbeat_task
