"""
ScriptSupervisorNode — Script Accuracy & Continuity HITL Node

First HITL checkpoint in the pipeline. Receives the list of generated shots
alongside their compiled Veo prompts, then pauses execution while a human
reviews each clip for script accuracy and narrative continuity. The user may
edit any prompt and trigger a single-shot re-generation before approving the
full scene.

Flow
----
1. Read ``job_id`` / ``node_id`` from execution context (``extra_pnginfo`` /
   ``unique_id``).
2. Build a per-slot payload carrying the current UUID, original UUID, and all
   Veo gen_params (both editable and locked fields).
3. Create a ``ManualReviewTask`` in the database with
   ``node_type="script_supervisor"`` and ``payload={"shots": [...]}``.
4. If ``auto_confirm=True`` → resolve immediately with the original UUID list.
5. Publish a ``WAITING_FOR_REVIEW`` event via RabbitMQ → WS Gateway so the
   frontend can open the Script Supervisor UI.
6. Poll the DB every 5 seconds until the task reaches ``status="completed"``
   (set by the frontend via ``POST /review/{id}/complete``).
7. Return ``IO.NodeOutput(task.decision["final_uuids"])`` — the authoritative
   final UUID list (possibly containing re-generated UUIDs) travels via the
   ComfyUI wire to the downstream ``ShotReviewNode``.

Note: no writes to ``extra_pnginfo``. Final UUIDs flow exclusively via wire.
"""

from __future__ import annotations

import asyncio
import logging
from uuid import UUID

from comfy_api.latest import IO, ComfyExtension
from comfy_api.latest._io import Hidden
from typing_extensions import override

from comfy_api_nodes.context_keys import MEDIA_GEN_PARAMS, MEDIA_PROMPTS
from server import PromptServer

logger = logging.getLogger(__name__)

NODE_TYPE = "script_supervisor"
POLL_INTERVAL_SECONDS = 5.0


# ── Node ──────────────────────────────────────────────────────────────────────


class ScriptSupervisorNode(IO.ComfyNode):
    """Script accuracy & continuity review gate.

    Temporal HITL interface
    -----------------------
    temporal_hitl = True signals the workflow to use hitl_setup / hitl_finalize
    instead of the regular execute_node dynamic activity.
    """

    # ── Temporal HITL interface ───────────────────────────────────────────
    temporal_hitl = True

    @classmethod
    def hitl_node_type(cls) -> str:
        return NODE_TYPE

    @classmethod
    def hitl_payload(cls, resolved: dict, exec_context: dict) -> dict:
        """Build ManualReviewTask.payload from resolved inputs + exec_context."""
        video_uuids: list[str] = resolved.get("video_uuids") or []
        media_prompts: dict = exec_context.get(MEDIA_PROMPTS, {})
        media_gen_params: dict = exec_context.get(MEDIA_GEN_PARAMS, {})
        shots: list[dict] = [
            {
                "slot_index": i,
                "current_uuid": uuid,
                "original_uuid": uuid,
                "regen_status": None,
                "gen_params": {
                    "prompt": media_prompts.get(uuid, ""),
                    **{
                        k: media_gen_params.get(uuid, {}).get(k, default)
                        for k, default in [
                            ("negative_prompt", ""),
                            ("resolution", "720p"),
                            ("aspect_ratio", "16:9"),
                            ("duration", 8),
                            ("model", "veo-3.1-lite-generate-001"),
                            ("first_frame_uuid", None),
                            ("last_frame_uuid", None),
                        ]
                    },
                },
            }
            for i, uuid in enumerate(video_uuids)
        ]
        return {"shots": shots}

    @classmethod
    def hitl_output(cls, resolved: dict, decision: dict) -> tuple:
        """Return wire output tuple (matches define_schema outputs order)."""
        video_uuids: list[str] = resolved.get("video_uuids") or []
        final_uuids: list[str] = decision.get("final_uuids", video_uuids)
        return (final_uuids,)

    @classmethod
    def hitl_context(cls, resolved: dict, decision: dict) -> dict:
        """No context patch — final UUIDs travel via wire only."""
        return {}

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="ScriptSupervisorNode",
            display_name="Script Supervisor (Manual)",
            category="api node/manual/Ambassador",
            description=(
                "Manual HITL gate. Displays each generated shot alongside its "
                "compiled Veo prompt. The user can edit a prompt and re-generate "
                "individual shots before approving the full scene for downstream "
                "trimming."
            ),
            is_output_node=True,
            is_input_list=True,
            hidden=[Hidden.unique_id, Hidden.extra_pnginfo],
            inputs=[
                IO.String.Input(
                    "video_uuids",
                    force_input=True,
                    tooltip="List of video media_ids from the generation node.",
                ),
                IO.Boolean.Input(
                    "auto_confirm",
                    default=False,
                    tooltip=(
                        "Skip human review and immediately pass through the original "
                        "UUIDs. Useful for CI / automated runs."
                    ),
                    optional=True,
                ),
            ],
            outputs=[
                IO.String.Output(
                    display_name="video_uuids",
                    is_output_list=True,
                    tooltip=(
                        "Final video UUIDs after script review. Contains the original "
                        "UUID for slots the user approved and the new UUID for any "
                        "re-generated slots."
                    ),
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        video_uuids: list[str],
        auto_confirm: list[bool] | None = None,
    ) -> IO.NodeOutput:
        # is_input_list=True → scalar inputs arrive as single-element lists
        should_confirm: bool = bool(auto_confirm[0]) if auto_confirm else False

        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        logger.info("[ScriptSupervisorNode] extra_pnginfo keys=%r", list(extra_pnginfo.keys()))

        job_id_str: str = extra_pnginfo.get("job_id", "")
        node_id_str: str = cls.hidden.unique_id or ""

        if not job_id_str:
            raise ValueError(
                "job_id not found in execution context. "
                "Ensure the template is run via the JobService."
            )

        from backend_template.engine.database import engine_session_maker
        from backend_template.repositories.manual_review_task import ManualReviewTaskRepository

        job_id = UUID(job_id_str)
        try:
            node_id = UUID(node_id_str)
        except (ValueError, AttributeError):
            node_id = UUID(int=0)

        # ── Read per-media metadata from execution context ────────────────────
        media_prompts: dict = extra_pnginfo.get(MEDIA_PROMPTS, {})
        media_gen_params: dict = extra_pnginfo.get(MEDIA_GEN_PARAMS, {})

        # ── Build per-slot payload ────────────────────────────────────────────
        shots: list[dict] = [
            {
                "slot_index": i,
                "current_uuid": uuid,
                "original_uuid": uuid,
                "regen_status": None,    # null = idle | "regenerating" = in-progress
                "gen_params": {
                    "prompt":           media_prompts.get(uuid, ""),
                    **{
                        k: media_gen_params.get(uuid, {}).get(k, default)
                        for k, default in [
                            ("negative_prompt", ""),
                            ("resolution", "720p"),
                            ("aspect_ratio", "16:9"),
                            ("duration", 8),
                            ("model", "veo-3.1-lite-generate-001"),
                            ("first_frame_uuid", None),
                            ("last_frame_uuid", None),
                        ]
                    },
                },
            }
            for i, uuid in enumerate(video_uuids)
        ]

        # ── Fast path: skip DB entirely when auto-confirming ─────────────────
        if should_confirm:
            logger.info(
                "[ScriptSupervisorNode] auto_confirm=True — returning %d UUIDs immediately",
                len(video_uuids),
            )
            return IO.NodeOutput(video_uuids, ui={"video_uuids": video_uuids})

        # ── Create the review task (only for actual human review) ─────────────
        async with engine_session_maker() as session:
            repo = ManualReviewTaskRepository(session)
            task = await repo.create(
                job_id=job_id,
                node_id=node_id,
                node_type=NODE_TYPE,
                auto_confirm=False,
                status="pending",
                payload={"shots": shots},
                decision=None,
            )
            task_id = task.id

        logger.debug(
            "[ScriptSupervisorNode] Created review task %s (shots=%d)",
            task_id,
            len(shots),
        )

        # ── Notify via send_sync (same FIFO queue as engine events) ──────────
        PromptServer.instance.send_sync(
            "WAITING_FOR_REVIEW",
            {"node": node_id_str, "prompt_id": extra_pnginfo.get("prompt_id", "")},
        )

        # ── Poll until the user approves ──────────────────────────────────────
        logger.info(
            "[ScriptSupervisorNode] Waiting for script review on task %s …",
            task_id,
        )
        while True:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

            async with engine_session_maker() as session:
                repo = ManualReviewTaskRepository(session)
                task = await repo.get_by_id(task_id)

            if task is None:
                raise ValueError(
                    f"Review task {task_id} was deleted while awaiting script review."
                )

            if task.status == "completed":
                decision = task.decision or {}
                # Fallback to original list if decision lacks final_uuids
                final_uuids: list[str] = decision.get("final_uuids", video_uuids)
                logger.info(
                    "[ScriptSupervisorNode] Task %s completed — %d final UUIDs",
                    task_id,
                    len(final_uuids),
                )
                return IO.NodeOutput(final_uuids, ui={"video_uuids": final_uuids})

            logger.debug(
                "[ScriptSupervisorNode] Task %s status=%r, still waiting …",
                task_id,
                task.status,
            )


# ── Extension & Entry Point ───────────────────────────────────────────────────


class ScriptSupervisorExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [ScriptSupervisorNode]


async def comfy_entrypoint() -> ScriptSupervisorExtension:
    return ScriptSupervisorExtension()
