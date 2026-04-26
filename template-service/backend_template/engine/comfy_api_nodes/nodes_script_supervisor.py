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
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing_extensions import override

from comfy_api_nodes.util.broker import publish_event

logger = logging.getLogger(__name__)

NODE_TYPE = "script_supervisor"
POLL_INTERVAL_SECONDS = 5.0


# ── Internal event model ──────────────────────────────────────────────────────


class _NodeStatusEvent(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)

    job_id: str
    prompt_id: str = ""
    node_id: str
    user_id: str
    status: str
    outputs: dict | None = None
    error: str | None = None
    job_status: str | None = None


# ── Node ──────────────────────────────────────────────────────────────────────


class ScriptSupervisorNode(IO.ComfyNode):
    """Script accuracy & continuity review gate.

    First HITL node in the Ambassador pipeline. Receives the generated shots
    alongside their Veo prompts. Pauses graph execution while the user reviews
    each clip, optionally edits a prompt and re-generates a shot. Resumes once
    the user presses **Approve & Continue**, forwarding the final (possibly
    partially re-generated) UUID list to the downstream ``ShotReviewNode`` via
    wire.
    """

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
                    tooltip="List of video media_ids from AvatarSceneNode.",
                ),
                IO.String.Input(
                    "veo_prompts",
                    force_input=True,
                    tooltip=(
                        "List of compiled Veo prompts — one per shot, "
                        "from AvatarSceneNode's veo_prompts output."
                    ),
                ),
                IO.String.Input(
                    "first_frame_uuid",
                    force_input=True,
                    optional=True,
                    tooltip=(
                        "Media Ingest UUID of the first-frame image used during "
                        "the original generation. Stored in the task payload for "
                        "re-generation; not editable by the user."
                    ),
                ),
                IO.Combo.Input(
                    "veo_model",
                    options=[
                        "veo-3.1-generate",
                        "veo-3.1-fast-generate",
                        "veo-3.1-lite-generate-001",
                    ],
                    default="veo-3.1-lite-generate-001",
                    tooltip="Veo model used during the original generation (default for re-generation).",
                    optional=True,
                ),
                IO.Combo.Input(
                    "aspect_ratio",
                    options=["16:9", "9:16"],
                    default="16:9",
                    tooltip="Aspect ratio used during the original generation (default for re-generation).",
                    optional=True,
                ),
                IO.Int.Input(
                    "duration",
                    default=8,
                    min=4,
                    max=8,
                    step=2,
                    display_mode=IO.NumberDisplay.slider,
                    tooltip="Duration in seconds used during the original generation (4 / 6 / 8).",
                    optional=True,
                ),
                IO.String.Input(
                    "negative_prompt",
                    multiline=True,
                    default="",
                    tooltip="Negative prompt applied to all re-generations.",
                    optional=True,
                ),
                IO.Combo.Input(
                    "resolution",
                    options=["720p", "1080p"],
                    default="720p",
                    tooltip="Output resolution used during the original generation.",
                    optional=True,
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
        veo_prompts: list[str],
        first_frame_uuid: list[str] | None = None,
        veo_model: list[str] | None = None,
        aspect_ratio: list[str] | None = None,
        duration: list[int] | None = None,
        negative_prompt: list[str] | None = None,
        resolution: list[str] | None = None,
        auto_confirm: list[bool] | None = None,
    ) -> IO.NodeOutput:
        # is_input_list=True → scalar inputs arrive as single-element lists
        first_frame_uuid_val: str | None = (first_frame_uuid[0] if first_frame_uuid else None)
        veo_model_val: str = (veo_model[0] if veo_model else "veo-3.1-lite-generate-001")
        aspect_ratio_val: str = (aspect_ratio[0] if aspect_ratio else "16:9")
        duration_val: int = (duration[0] if duration else 8)
        negative_prompt_val: str = (negative_prompt[0] if negative_prompt else "")
        resolution_val: str = (resolution[0] if resolution else "720p")
        should_confirm: bool = bool(auto_confirm[0]) if auto_confirm else False

        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        logger.info("[ScriptSupervisorNode] extra_pnginfo=%r", extra_pnginfo)

        job_id_str: str = extra_pnginfo.get("job_id", "")
        node_id_str: str = cls.hidden.unique_id or ""

        if not job_id_str:
            raise ValueError(
                "job_id not found in execution context. "
                "Ensure the template is run via the JobService."
            )

        from backend_template.database import async_session_maker
        from backend_template.repositories.manual_review_task import ManualReviewTaskRepository

        job_id = UUID(job_id_str)
        try:
            node_id = UUID(node_id_str)
        except (ValueError, AttributeError):
            node_id = UUID(int=0)

        # ── Build per-slot payload ────────────────────────────────────────────
        shots: list[dict] = [
            {
                "slot_index": i,
                "current_uuid": uuid,
                "original_uuid": uuid,
                "regen_status": None,    # null = idle | "regenerating" = in-progress
                "gen_params": {
                    "prompt":           veo_prompts[i] if i < len(veo_prompts) else "",
                    "negative_prompt":  negative_prompt_val,
                    "resolution":       resolution_val,
                    "aspect_ratio":     aspect_ratio_val,
                    "duration":         duration_val,
                    "model":            veo_model_val,
                    "first_frame_uuid": first_frame_uuid_val,
                    "last_frame_uuid":  None,  # AvatarSceneNode does not use last frames
                },
            }
            for i, uuid in enumerate(video_uuids)
        ]

        # ── Create the review task ────────────────────────────────────────────
        async with async_session_maker() as session:
            repo = ManualReviewTaskRepository(session)
            task = await repo.create(
                job_id=job_id,
                node_id=node_id,
                node_type=NODE_TYPE,
                auto_confirm=should_confirm,
                status="auto_confirmed" if should_confirm else "pending",
                payload={"shots": shots},
                decision=None,
            )
            task_id = task.id

        logger.info(
            "[ScriptSupervisorNode] Created review task %s "
            "(auto_confirm=%s, shots=%d)",
            task_id,
            should_confirm,
            len(shots),
        )

        if should_confirm:
            logger.info("[ScriptSupervisorNode] auto_confirm=True — resolving immediately")
            return IO.NodeOutput(video_uuids, ui={"video_uuids": video_uuids})

        # ── Notify frontend via RabbitMQ → WS Gateway ────────────────────────
        user_id: str = extra_pnginfo.get("client_id", "")
        await publish_event(
            "node-status-changed",
            _NodeStatusEvent(
                job_id=job_id_str,
                node_id=node_id_str,
                user_id=user_id,
                status="WAITING_FOR_REVIEW",
            ),
        )

        # ── Poll until the user approves ──────────────────────────────────────
        logger.info(
            "[ScriptSupervisorNode] Waiting for script review on task %s …",
            task_id,
        )
        while True:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

            async with async_session_maker() as session:
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
