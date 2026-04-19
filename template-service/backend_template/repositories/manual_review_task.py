from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db
from backend_template.models.manual_review_task import ManualReviewTask
from backend_template.repositories.base import BaseRepository


class ManualReviewTaskRepository(BaseRepository[ManualReviewTask]):

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(ManualReviewTask, db)

    async def get_pending_by_job(self, job_id: UUID) -> ManualReviewTask | None:
        query = select(ManualReviewTask).where(
            ManualReviewTask.job_id == job_id,
            ManualReviewTask.status == "pending",
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_job_and_node(self, job_id: UUID, node_id: UUID) -> ManualReviewTask | None:
        query = select(ManualReviewTask).where(
            ManualReviewTask.job_id == job_id,
            ManualReviewTask.node_id == node_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()
