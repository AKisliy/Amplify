"""
Generic HITL activities for Temporal Signals-based human-in-the-loop nodes.

Two activities:
  hitl_setup    — cache check + DB task creation + WAITING_FOR_REVIEW notification
  hitl_finalize — output computation + cache write + SUCCESS publication

Both dispatch dynamically via NODE_CLASS_MAPPINGS[class_type].temporal_hitl interface:
  - temporal_hitl: bool              (class attribute flag)
  - hitl_node_type() -> str          (DB node_type field, e.g. "shot_review")
  - hitl_payload(resolved, exec_context) -> dict  (ManualReviewTask.payload)
  - hitl_output(resolved, decision) -> tuple      (wire outputs, indexed like define_schema outputs)
  - hitl_context(resolved, decision) -> dict      (_context_patch for exec_context)
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from uuid import UUID

from temporalio import activity

from backend_template.config import settings
from backend_template.temporal.activities.base import NodeActivityInput
from backend_template.temporal.activities.status import publish_node_status
from backend_template.temporal.cache import compute_cache_key, get_cached, set_cached
from backend_template.temporal.registry import NODE_CLASS_MAPPINGS

logger = logging.getLogger(__name__)

_CONTEXT_PATCH_KEY = "_context_patch"


@dataclass
class HitlSetupResult:
    is_cached: bool = False
    auto_confirmed: bool = False
    task_id: str | None = None
    cache_key: str = ""
    # Populated only on cache hit: {wire_outputs..., "_context_patch": {...}}
    cached_value: dict = field(default_factory=dict)


@dataclass
class HitlFinalizeInput:
    inp: NodeActivityInput
    decision: dict = field(default_factory=dict)
    cache_key: str = ""


@activity.defn
async def hitl_setup(inp: NodeActivityInput) -> HitlSetupResult:
    """
    Phase 1 of HITL execution:
      1. Cache check — return cached value immediately if hit.
      2. Detect auto_confirm — skip DB if True.
      3. Create ManualReviewTask in DB.
      4. Publish WAITING_FOR_REVIEW status event.
    """
    from backend_template.engine.database import engine_session_maker
    from backend_template.repositories.manual_review_task import ManualReviewTaskRepository

    class_type = inp.class_type
    node_cls = NODE_CLASS_MAPPINGS[class_type]

    cache_key = compute_cache_key(class_type, inp.resolved)

    # --- Cache read ---
    if inp.can_use_cache and settings.cache_enabled:
        cached = await get_cached(cache_key)
        if cached is not None:
            logger.info("HITL cache hit: %s node_id=%s", class_type, inp.node_id)
            await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "CACHED",
                                       template_id=inp.template_id, project_id=inp.project_id)
            return HitlSetupResult(is_cached=True, cached_value=cached, cache_key=cache_key)

    # --- Auto-confirm fast path ---
    auto_confirm_raw = inp.resolved.get("auto_confirm")
    if isinstance(auto_confirm_raw, list):
        auto_confirm_val = bool(auto_confirm_raw[0]) if auto_confirm_raw else False
    else:
        auto_confirm_val = bool(auto_confirm_raw) if auto_confirm_raw is not None else False

    if auto_confirm_val:
        logger.info("HITL auto_confirm: %s node_id=%s", class_type, inp.node_id)
        return HitlSetupResult(auto_confirmed=True, cache_key=cache_key)

    # --- Build payload ---
    payload = node_cls.hitl_payload(inp.resolved, inp.exec_context)

    # --- Create DB task ---
    job_id = UUID(inp.job_id)
    try:
        node_id = UUID(inp.node_id)
    except (ValueError, AttributeError):
        node_id = UUID(int=0)

    async with engine_session_maker() as session:
        repo = ManualReviewTaskRepository(session)
        task = await repo.create(
            job_id=job_id,
            node_id=node_id,
            node_type=node_cls.hitl_node_type(),
            auto_confirm=False,
            status="pending",
            payload=payload,
            decision=None,
        )
        task_id = str(task.id)

    logger.info(
        "HITL task created: %s node_id=%s task_id=%s", class_type, inp.node_id, task_id
    )

    # --- Notify frontend ---
    await publish_node_status(inp.job_id, inp.node_id, inp.user_id, "WAITING_FOR_REVIEW",
                              template_id=inp.template_id, project_id=inp.project_id)

    return HitlSetupResult(task_id=task_id, cache_key=cache_key)


@activity.defn
async def hitl_finalize(finalize_inp: HitlFinalizeInput) -> dict:
    """
    Phase 2 of HITL execution (after signal or auto_confirm):
      1. Compute wire outputs via node's hitl_output(resolved, decision).
      2. Compute context patch via node's hitl_context(resolved, decision).
      3. Write to cache (stores wire_outputs + _context_patch together).
      4. Publish SUCCESS status.
      5. Return {**wire_outputs, "_context_patch": context_patch}.
    """
    inp = finalize_inp.inp
    decision = finalize_inp.decision
    class_type = inp.class_type
    node_cls = NODE_CLASS_MAPPINGS[class_type]

    schema = node_cls.GET_SCHEMA()
    output_fields = [out.display_name for out in schema.outputs]

    # Compute wire outputs
    raw_outputs = node_cls.hitl_output(inp.resolved, decision)
    outputs: dict = {}
    for i, field_name in enumerate(output_fields):
        try:
            outputs[field_name] = raw_outputs[i]
        except (IndexError, TypeError):
            outputs[field_name] = None

    # Compute context patch
    context_patch: dict = node_cls.hitl_context(inp.resolved, decision)

    # Cache write: store wire_outputs + context_patch together
    if settings.cache_enabled:
        cached_value = {**outputs, _CONTEXT_PATCH_KEY: context_patch}
        await set_cached(finalize_inp.cache_key, class_type, cached_value)

    # Publish SUCCESS
    await publish_node_status(
        inp.job_id,
        inp.node_id,
        inp.user_id,
        "SUCCESS",
        outputs={k: v if isinstance(v, list) else [v] for k, v in outputs.items()},
        template_id=inp.template_id,
        project_id=inp.project_id,
    )

    logger.info("HITL finalized: %s node_id=%s", class_type, inp.node_id)
    return {**outputs, _CONTEXT_PATCH_KEY: context_patch}
