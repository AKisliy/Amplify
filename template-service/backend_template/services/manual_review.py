from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status

from backend_template.entities.manual_review import (
    ManualReviewCompleteRequest,
    ManualReviewCreateRequest,
    ManualReviewTaskResponse,
)
from backend_template.repositories.manual_review_task import ManualReviewTaskRepository


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
        updated = await self.repo.update(task_id, status="completed", decision=req.decision)
        return ManualReviewTaskResponse.model_validate(updated)
