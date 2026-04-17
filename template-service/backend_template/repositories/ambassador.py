from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend_template.database import get_db
from backend_template.models.ambassador import Ambassador, ReferenceImage
from backend_template.repositories.base import BaseRepository


class AmbassadorRepository(BaseRepository[Ambassador]):

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(Ambassador, db)

    def _with_images(self):
        return select(Ambassador).options(selectinload(Ambassador.reference_images))

    async def get_by_id(self, id: UUID) -> Ambassador | None:
        """Override to always load reference_images (async sessions forbid lazy load)."""
        query = self._with_images().where(Ambassador.id == id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_project_id(self, project_id: UUID) -> Ambassador | None:
        query = self._with_images().where(Ambassador.project_id == project_id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def create(self, **kwargs) -> Ambassador:
        """Override to reload with reference_images after insert."""
        orm_obj = await super().create(**kwargs)
        # refresh to get the images relationship loaded (empty list on creation)
        return await self.get_by_id(orm_obj.id)


class ReferenceImageRepository(BaseRepository[ReferenceImage]):
    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(ReferenceImage, db)
