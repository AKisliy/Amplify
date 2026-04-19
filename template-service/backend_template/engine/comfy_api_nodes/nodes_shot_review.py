"""
ShotReviewNode — Manual Human-Review Node

A "manual node" that pauses the pipeline and waits for a human to review and
trim the generated shots before execution continues.

Flow
----
1. Read ``job_id`` / ``node_id`` from execution context (``extra_pnginfo`` /
   ``unique_id``).
2. Create a ``ManualReviewTask`` in the database with
   ``node_type="shot_review"`` and ``payload={"video_uuids": [...]}``.
3. If ``auto_confirm=True`` → resolve immediately with an empty decision.
4. Otherwise poll the database every few seconds until the task reaches
   ``status="completed"`` (set by the frontend via ``POST /review/{id}/complete``).
5. Return the original ``video_uuids`` list and the user's ``decision`` JSON
   string so downstream nodes can apply trim points.
"""

from __future__ import annotations

import asyncio
import json
import logging
from uuid import UUID

from comfy_api.latest import IO, ComfyExtension
from comfy_api.latest._io import Hidden
from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from typing_extensions import override

from comfy_api_nodes.util.broker import publish_event

logger = logging.getLogger(__name__)

NODE_TYPE = "shot_review"
POLL_INTERVAL_SECONDS = 5.0


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


class ShotReviewNode(IO.ComfyNode):
    """Manual review node — pauses execution until the user approves / trims shots.

    Receives a list of video UUIDs (typically from ``AvatarSceneNode``), stores
    them in a ``ManualReviewTask``, then waits for the frontend to submit the
    user's trim decisions before returning.
    """

    @classmethod
    def define_schema(cls):
        return IO.Schema(
            node_id="ShotReviewNode",
            display_name="Shot Review (Manual)",
            category="api node/manual/Ambassador",
            description=(
                "Manual review node. Pauses the pipeline and waits for human "
                "confirmation. The frontend shows a fullscreen timeline where the "
                "user can preview and trim each shot before approving."
            ),
            is_output_node=False,
            is_input_list=True,
            hidden=[Hidden.unique_id, Hidden.extra_pnginfo],
            inputs=[
                IO.String.Input(
                    "video_uuids",
                    force_input=True,
                    tooltip="List of video media_ids from AvatarSceneNode.",
                ),
                IO.Boolean.Input(
                    "auto_confirm",
                    default=False,
                    tooltip="Skip human review and pass through immediately (for testing).",
                    optional=True,
                ),
            ],
            outputs=[
                IO.String.Output(
                    display_name="video_uuids",
                    is_output_list=True,
                    tooltip="Same video UUIDs passed through after review.",
                ),
                IO.String.Output(
                    display_name="decision",
                    tooltip="User's decision as a JSON string (trim points per shot).",
                ),
            ],
        )

    @classmethod
    async def execute(
        cls,
        video_uuids: list[str],
        auto_confirm: list[bool] | None = None,
    ) -> IO.NodeOutput:
        # is_input_list=True → all inputs arrive as lists; unwrap the scalar
        should_confirm = bool(auto_confirm[0]) if auto_confirm else False
        auto_confirm = should_confirm  # type: ignore[assignment]
        extra_pnginfo = cls.hidden.extra_pnginfo or {}
        logger.info("[ShotReviewNode] extra_pnginfo=%r", extra_pnginfo)

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
        # unique_id in our system is the reactflow node UUID
        try:
            node_id = UUID(node_id_str)
        except (ValueError, AttributeError):
            node_id = UUID(int=0)

        # ── Create the review task ────────────────────────────────────────
        async with async_session_maker() as session:
            repo = ManualReviewTaskRepository(session)
            task = await repo.create(
                job_id=job_id,
                node_id=node_id,
                node_type=NODE_TYPE,
                auto_confirm=auto_confirm,
                status="auto_confirmed" if auto_confirm else "pending",
                payload={"video_uuids": video_uuids},
                decision=None,
            )
            task_id = task.id

        logger.info(
            "[ShotReviewNode] Created review task %s (auto_confirm=%s, videos=%d)",
            task_id,
            auto_confirm,
            len(video_uuids),
        )

        if auto_confirm:
            logger.info("[ShotReviewNode] auto_confirm=True, resolving immediately")
            return IO.NodeOutput(video_uuids, "{}")

        # ── Notify frontend via RabbitMQ → WS Gateway ────────────────────
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

        # ── Poll until the user submits their decision ────────────────────
        logger.info("[ShotReviewNode] Waiting for human review on task %s …", task_id)
        while True:
            await asyncio.sleep(POLL_INTERVAL_SECONDS)

            async with async_session_maker() as session:
                repo = ManualReviewTaskRepository(session)
                task = await repo.get_by_id(task_id)

            if task is None:
                raise ValueError(f"Review task {task_id} was deleted while waiting.")

            if task.status == "completed":
                decision_str = json.dumps(task.decision or {})
                logger.info(
                    "[ShotReviewNode] Task %s completed — decision=%s",
                    task_id,
                    decision_str,
                )
                return IO.NodeOutput(video_uuids, decision_str)

            logger.debug(
                "[ShotReviewNode] Task %s status=%r, still waiting …",
                task_id,
                task.status,
            )


# ── Extension & Entry Point ───────────────────────────────────────────


class ShotReviewExtension(ComfyExtension):
    @override
    async def get_node_list(self) -> list[type[IO.ComfyNode]]:
        return [ShotReviewNode]


async def comfy_entrypoint() -> ShotReviewExtension:
    return ShotReviewExtension()