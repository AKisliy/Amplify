# backend_template/services/library_template.py

from typing import Annotated, Sequence
from uuid import UUID

from fastapi import Depends, HTTPException, status

from backend_template.entities.library_template import (
    LibraryTemplateCreate,
    LibraryTemplateResponse,
    LibraryTemplateUpdate,
)
from backend_template.entities.events import (
    LibraryTemplateCreatedEvent,
    LibraryTemplateDeletedEvent,
    LibraryTemplateUpdatedEvent,
)
from backend_template.repositories.library_template import LibraryTemplateRepository
from backend_template.utils.broker import TEMPLATE_EVENTS_EXCHANGE, publish_event


class LibraryTemplateService:
    """
    Business Logic Layer for Library Templates.
    Orchestrates data flow between Controller (Schemas) and Repository (ORM).

    After each mutating operation the service publishes a lifecycle event to the
    ``template.events`` RabbitMQ exchange so downstream services (UserService,
    etc.) can react without polling.  Publishing is best-effort: a failure logs
    an error but never rolls back the primary DB operation.
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
        Publishes a ``template.created`` event on success.
        """
        # 1. Convert Schema to Dictionary for Repository
        template_data = payload.model_dump()

        # 2. Call Repository (Returns ORM Model)
        orm_template = await self.repo.create(**template_data)

        # 3. Convert ORM Model -> Pydantic Schema (Prevention of Leak)
        response = LibraryTemplateResponse.model_validate(orm_template)

        # 4. Publish lifecycle event (best-effort — failures are only logged)
        await publish_event(
            TEMPLATE_EVENTS_EXCHANGE,
            LibraryTemplateCreatedEvent(
                template_id=response.id,
                name=response.name,
                description=response.description,
                thumbnail_url=response.thumbnail_url,
            ),
        )

        return response

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
        Publishes a ``template.updated`` event on success.
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
        response = LibraryTemplateResponse.model_validate(updated_orm)

        # 5. Publish lifecycle event (only if at least one field changed)
        if update_data:
            await publish_event(
                TEMPLATE_EVENTS_EXCHANGE,
                LibraryTemplateUpdatedEvent(
                    template_id=template_id,
                    changed_fields=update_data,
                ),
            )

        return response

    async def delete_template(self, template_id: UUID) -> None:
        """
        Deletes a library template (internal use only).
        Publishes a ``template.deleted`` event on success.
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

        # 3. Publish lifecycle event
        await publish_event(
            TEMPLATE_EVENTS_EXCHANGE,
            LibraryTemplateDeletedEvent(template_id=template_id),
        )
