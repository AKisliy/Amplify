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
    (e.g. "media_files.media_file_0"). The config dict also carries stale plain
    keys (e.g. "media_file_0") for the same slot — ComfyUI silently drops these
    in get_input_data() by filtering against finalized valid_inputs.

    We replicate that filter here: keep only keys present in the finalized schema,
    then let build_nested_inputs nest the dot-notation keys into the expected dict.
    """
    from comfy_api.latest._io import build_nested_inputs, get_finalized_class_inputs
    try:
        valid_inputs = node_cls.INPUT_TYPES()
        finalized, _, v3_data = get_finalized_class_inputs(valid_inputs, resolved)
        valid_keys = (
            set(finalized.get("required", {}).keys())
            | set(finalized.get("optional", {}).keys())
        )
        filtered = {k: v for k, v in resolved.items() if k in valid_keys}
        return build_nested_inputs(filtered, v3_data)
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
        from comfy_api.latest._io import Hidden

        from comfy_api.latest._io import Hidden
        from execution import get_output_from_returns  # engine/ on sys.path

        resolved = _preprocess_resolved(node_cls, inp.resolved)

        # Build hidden inputs and clone the class (mirrors PREPARE_CLASS_CLONE in ComfyUI).
        # Cloning prevents hidden state leaking across concurrent activities of the same type.
        schema = node_cls.define_schema()
        v3_hidden: dict = {}
        extra_pnginfo: dict = {**inp.exec_context, "job_id": inp.job_id, "client_id": inp.user_id}
        if schema.hidden:
            hidden_names = {h.name for h in schema.hidden}
            if Hidden.extra_pnginfo.name in hidden_names:
                v3_hidden[Hidden.extra_pnginfo] = extra_pnginfo
            if Hidden.unique_id.name in hidden_names:
                v3_hidden[Hidden.unique_id] = inp.node_id
        node_clone = node_cls.PREPARE_CLASS_CLONE({"hidden_inputs": v3_hidden})

        # Mirror _async_map_node_over_list from ComfyUI's execution.py:
        # wrap scalars in [v], then either pass full lists (INPUT_IS_LIST) or
        # slice N times and call execute once per element.
        input_data_all = {
            k: v if isinstance(v, (list, dict)) else [v]
            for k, v in resolved.items()
        }
        input_is_list = getattr(node_clone, "INPUT_IS_LIST", False)
        if input_is_list:
            result_list = [await node_clone.EXECUTE_NORMALIZED_ASYNC(**input_data_all)]
        else:
            max_len = max((len(v) for v in input_data_all.values() if isinstance(v, list)), default=1)

            def slice_dict(d: dict, i: int) -> dict:
                return {k: v[i if len(v) > i else -1] if isinstance(v, list) else v for k, v in d.items()}

            result_list = []
            for i in range(max_len):
                sliced = slice_dict(input_data_all, i)
                logger.info("[execute_node] %s call %d/%d inputs=%s", class_type, i+1, max_len,
                            {k: v for k, v in sliced.items() if k == "prompt"})
                result_list.append(await node_clone.EXECUTE_NORMALIZED_ASYNC(**sliced))

        # get_output_from_returns handles NodeOutput → tuple conversion (r.result = r.args)
        # and calls merge_result_data internally, producing a list per output slot.
        merged, _, _ = get_output_from_returns(result_list, node_clone)
        outputs: dict = {}
        for i, out in enumerate(schema.outputs):
            try:
                outputs[out.display_name] = merged[i]
            except (IndexError, TypeError):
                outputs[out.display_name] = None

        # Propagate media context written by @with_media_context into _context_patch.
        # with_media_context mutates extra_pnginfo in-place; that dict is local to this
        # activity so we must forward any new keys back to the workflow exec_context.
        from comfy_api_nodes.context_keys import MEDIA_PROMPTS, MEDIA_GEN_PARAMS
        context_patch: dict = {}
        for key in (MEDIA_PROMPTS, MEDIA_GEN_PARAMS):
            if key in extra_pnginfo:
                context_patch[key] = extra_pnginfo[key]
        if context_patch:
            outputs["_context_patch"] = context_patch

        await publish_node_status(
            inp.job_id, inp.node_id, inp.user_id, "SUCCESS",
            outputs={
                k: v if isinstance(v, list) else [v]
                for k, v in outputs.items()
                if k != "_context_patch"
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
