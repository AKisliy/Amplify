# backend_template/repositories/project_template.py
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db
from backend_template.models.project_template import ProjectTemplate
from backend_template.repositories.base import BaseRepository

class ProjectTemplateRepository(BaseRepository[ProjectTemplate]):
    """
    Repository for ProjectTemplate entity.
    Inherits standard CRUD from BaseRepository.
    """

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(ProjectTemplate, db)

    # Future: Add custom queries here (e.g. get_by_project_id)
    # async def get_by_project_id(self, project_id: UUID) -> list[ProjectTemplate]:
    #     query = select(self.model).where(self.model.project_id == project_id)
    #     result = await self.db.execute(query)
    #     return result.scalars().all()