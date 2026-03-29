# backend_template/services/library_template.py

from typing import Annotated, Sequence
from uuid import UUID

from fastapi import Depends, HTTPException, status

from backend_template.entities.library_template import (
    LibraryTemplateCreate,
    LibraryTemplateResponse,
    LibraryTemplateUpdate,
)
from backend_template.repositories.library_template import LibraryTemplateRepository


class LibraryTemplateService:
    """
    Business Logic Layer for Library Templates.
    Orchestrates data flow between Controller (Schemas) and Repository (ORM).
    """

    def __init__(
        self,
        repo: Annotated[LibraryTemplateRepository, Depends(LibraryTemplateRepository)],
    ):
        """
        :param repo: Injected Repository layer.
        Service does NOT touch the raw DB session.
        """
        self.repo = repo

    async def create_template(
        self, payload: LibraryTemplateCreate
    ) -> LibraryTemplateResponse:
        """
        Creates a new LibraryTemplate (internal use only).
        Input: Pydantic Schema
        Output: Pydantic Schema
        """
        # 1. Convert Schema to Dictionary for Repository
        template_data = payload.model_dump()

        # 2. Call Repository (Returns ORM Model)
        orm_template = await self.repo.create(**template_data)

        # 3. Convert ORM Model -> Pydantic Schema (Prevention of Leak)
        return LibraryTemplateResponse.model_validate(orm_template)

    async def get_template(self, template_id: UUID) -> LibraryTemplateResponse:
        """
        Retrieves a library template by ID.
        Raises 404 if not found.
        """
        # 1. Fetch from Repo
        orm_template = await self.repo.get_by_id(template_id)

        # 2. Handle Not Found (Business Logic)
        if not orm_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"LibraryTemplate with ID {template_id} not found.",
            )

        # 3. Map to Response Schema
        return LibraryTemplateResponse.model_validate(orm_template)

    async def list_templates(
        self, skip: int = 0, limit: int = 100
    ) -> Sequence[LibraryTemplateResponse]:
        """
        Lists library templates with pagination.
        """
        # 1. Fetch List from Repo
        orm_templates = await self.repo.get_all(skip=skip, limit=limit)

        # 2. Map List[ORM] -> List[Schema]
        return [
            LibraryTemplateResponse.model_validate(t)
            for t in orm_templates
        ]

    async def update_template(
        self, template_id: UUID, payload: LibraryTemplateUpdate
    ) -> LibraryTemplateResponse:
        """
        Partially updates a library template (internal use only).
        """
        # 1. Check Existence first
        existing_template = await self.repo.get_by_id(template_id)
        if not existing_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"LibraryTemplate with ID {template_id} not found.",
            )

        # 2. Extract updates (exclude_unset allows PATCH behavior)
        update_data = payload.model_dump(exclude_unset=True)

        # 3. Perform Update
        updated_orm = await self.repo.update(template_id, **update_data)

        # 4. Map to Response
        return LibraryTemplateResponse.model_validate(updated_orm)

    async def delete_template(self, template_id: UUID) -> None:
        """
        Deletes a library template (internal use only).
        """
        # 1. Check Existence
        existing_template = await self.repo.get_by_id(template_id)
        if not existing_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"LibraryTemplate with ID {template_id} not found.",
            )

        # 2. Execute Delete
        await self.repo.delete(template_id)
