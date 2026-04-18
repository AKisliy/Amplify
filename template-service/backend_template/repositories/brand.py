from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db
from backend_template.models.brand import Brand
from backend_template.repositories.base import BaseRepository


class BrandRepository(BaseRepository[Brand]):
    """
    Repository for Brand entity.
    Inherits standard CRUD from BaseRepository.
    """

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(Brand, db)
