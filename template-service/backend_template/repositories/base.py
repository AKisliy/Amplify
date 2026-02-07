# backend_template/repositories/base.py

from typing import Generic, Type, TypeVar, Any, Sequence, Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db, Base

# Generic Type Variables
ModelType = TypeVar("ModelType", bound=Base)

class BaseRepository(Generic[ModelType]):
    """
    Base Repository implementing common CRUD operations.
    Dependencies are injected automatically by FastAPI.
    """
    
    def __init__(self, model: Type[ModelType], db: AsyncSession):
        """
        :param model: The SQLAlchemy model class (e.g. ProjectTemplate)
        :param db: The AsyncSession injected by FastAPI
        """
        self.model = model
        self.db = db

    async def get_by_id(self, id: UUID) -> ModelType | None:
        """Fetch a single record by its UUID."""
        query = select(self.model).where(self.model.id == id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[ModelType]:
        """Fetch all records with pagination."""
        query = select(self.model).offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, **kwargs: Any) -> ModelType:
        """Create a new record."""
        # Create the model instance
        db_obj = self.model(**kwargs)
        
        # Add to session
        self.db.add(db_obj)
        
        # Commit and refresh to get IDs/defaults
        await self.db.commit()
        await self.db.refresh(db_obj) # attribute_names ?
        return db_obj

    async def update(self, id: UUID, **kwargs: Any) -> ModelType | None:
        """
        Update a record by ID. 
        Uses 'fetch -> set -> commit' strategy to ensure Python-level validation runs.
        """
        # 1. Fetch the object first
        db_obj = await self.get_by_id(id)
        if not db_obj:
            return None

        # 2. Update attributes
        for key, value in kwargs.items():
            # Only update if the attribute exists on the model to avoid errors
            if hasattr(db_obj, key):
                setattr(db_obj, key, value)

        # 3. Commit and Refresh
        await self.db.commit()
        await self.db.refresh(db_obj)
        return db_obj

    async def delete(self, id: UUID) -> bool:
        """Delete a record by ID. Returns True if deleted."""
        query = delete(self.model).where(self.model.id == id)
        result = await self.db.execute(query)
        await self.db.commit()
        
        # rowcount returns the number of rows matched/deleted
        return result.rowcount > 0