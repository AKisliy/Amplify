import logging
from typing import Annotated
from uuid import UUID

from fastapi import BackgroundTasks, Depends, HTTPException, status

from backend_template.entities.manual_review import (
    ManualReviewCompleteRequest,
    ManualReviewCreateRequest,
    ManualReviewTaskResponse,
    ShotRegenerateRequest,
)
from backend_template.repositories.manual_review_task import ManualReviewTaskRepository

logger = logging.getLogger(__name__)


class ManualReviewService:

    def __init__(self, repo: Annotated[ManualReviewTaskRepository, Depends(ManualReviewTaskRepository)]):
        self.repo = repo

    async def create_task(self, req: ManualReviewCreateRequest) -> ManualReviewTaskResponse:
        status_val = "auto_confirmed" if req.auto_confirm else "pending"
        orm = await self.repo.create(
            job_id=req.job_id,
            node_id=req.node_id,
            node_type=req.node_type,
            auto_confirm=req.auto_confirm,
            status=status_val,
            payload=req.payload,
            decision=None,
        )
        return ManualReviewTaskResponse.model_validate(orm)

    async def get_task(self, task_id: UUID) -> ManualReviewTaskResponse:
        orm = await self.repo.get_by_id(task_id)
        if not orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review task not found.")
        return ManualReviewTaskResponse.model_validate(orm)

    async def get_pending_by_job(self, job_id: UUID) -> ManualReviewTaskResponse | None:
        orm = await self.repo.get_pending_by_job(job_id)
        if not orm:
            return None
        return ManualReviewTaskResponse.model_validate(orm)

    async def get_by_job_and_node(self, job_id: UUID, node_id: UUID) -> ManualReviewTaskResponse | None:
        orm = await self.repo.get_by_job_and_node(job_id, node_id)
        if not orm:
            return None
        return ManualReviewTaskResponse.model_validate(orm)

    async def complete_task(self, task_id: UUID, req: ManualReviewCompleteRequest) -> ManualReviewTaskResponse:
        orm = await self.repo.get_by_id(task_id)
        if not orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review task not found.")
        if orm.status not in ("pending",):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Task is already '{orm.status}', cannot complete.",
            )
        # Reject approval while a slot is actively being re-generated
        shots: list[dict] = (orm.payload or {}).get("shots", [])
        if any(s.get("regen_status") == "regenerating" for s in shots):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A shot is currently being re-generated. Wait for it to finish before approving.",
            )
        updated = await self.repo.update(task_id, status="completed", decision=req.decision)
        return ManualReviewTaskResponse.model_validate(updated)

    async def regenerate_shot(
        self,
        task_id: UUID,
        req: ShotRegenerateRequest,
        background_tasks: BackgroundTasks,
    ) -> ManualReviewTaskResponse:
        """Mark a single shot slot as regenerating and kick off a BackgroundTask.

        Returns 202 immediately. The background task calls Veo, registers the
        new UUID with MediaIngest, and atomically patches the slot via
        ``jsonb_set`` — safe for concurrent per-slot regeneration.
        """
        orm = await self.repo.get_by_id(task_id)
        if not orm:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Review task not found.")
        if orm.status != "pending":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Task is '{orm.status}', cannot regenerate (must be 'pending').",
            )

        shots: list[dict] = list((orm.payload or {}).get("shots", []))
        slot_index = req.slot_index
        if slot_index < 0 or slot_index >= len(shots):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"slot_index {slot_index} out of range (shots={len(shots)}).",
            )

        # Per-slot guard — prevent double-firing the same slot
        slot = shots[slot_index]
        if slot.get("regen_status") == "regenerating":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Shot #{slot_index} is already being re-generated.",
            )

        # Extract locked params (frames) from the stored payload
        gen_params: dict = slot.get("gen_params", {})
        first_frame_uuid: str | None = gen_params.get("first_frame_uuid")
        last_frame_uuid: str | None = gen_params.get("last_frame_uuid")

        # Atomically mark the slot as in-progress
        await self.repo.set_slot_regen_status(task_id, slot_index, "regenerating")
        # Re-fetch for the response
        updated = await self.repo.get_by_id(task_id)

        background_tasks.add_task(
            _run_regeneration,
            task_id=task_id,
            slot_index=slot_index,
            req=req,
            first_frame_uuid=first_frame_uuid,
            last_frame_uuid=last_frame_uuid,
        )

        return ManualReviewTaskResponse.model_validate(updated)


# ── Background task (module-level so FastAPI can pickle/call it) ──────────────


async def _run_regeneration(
    *,
    task_id: UUID,
    slot_index: int,
    req: ShotRegenerateRequest,
    first_frame_uuid: str | None,
    last_frame_uuid: str | None,
) -> None:
    """Background coroutine: call Veo, write new UUID back to DB payload.

    Uses atomic ``jsonb_set`` operations — safe to run concurrently with
    other slots' background tasks.  Creates its own DB session (the request
    session is closed by then).
    """
    from backend_template.database import async_session_maker
    from backend_template.repositories.manual_review_task import ManualReviewTaskRepository
    from backend_template.services.veo_regen import regenerate_veo_shot

    try:
        logger.info(
            "[_run_regeneration] Regenerating slot %d for task %s (model=%s)",
            slot_index, task_id, req.params.model,
        )
        new_uuid = await regenerate_veo_shot(
            prompt=req.params.prompt,
            negative_prompt=req.params.negative_prompt,
            resolution=req.params.resolution,
            aspect_ratio=req.params.aspect_ratio,
            duration=req.params.duration,
            model=req.params.model,
            first_frame_uuid=first_frame_uuid,
            last_frame_uuid=last_frame_uuid,
        )
        logger.info(
            "[_run_regeneration] Slot %d done — new_uuid=%s", slot_index, new_uuid,
        )
        async with async_session_maker() as session:
            repo = ManualReviewTaskRepository(session)
            await repo.complete_slot_regen(
                task_id, slot_index, new_uuid, req.params.prompt,
            )

    except Exception as exc:
        logger.error(
            "[_run_regeneration] Failed for task=%s slot=%d: %s",
            task_id, slot_index, exc,
        )
        async with async_session_maker() as session:
            repo = ManualReviewTaskRepository(session)
            await repo.fail_slot_regen(task_id, slot_index, str(exc))
