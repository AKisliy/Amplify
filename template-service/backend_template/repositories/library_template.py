from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db
from backend_template.models.library_template import LibraryTemplate
from backend_template.repositories.base import BaseRepository


class LibraryTemplateRepository(BaseRepository[LibraryTemplate]):
    """
    Repository for LibraryTemplate entity.
    Inherits standard CRUD from BaseRepository.
    """

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(LibraryTemplate, db)
