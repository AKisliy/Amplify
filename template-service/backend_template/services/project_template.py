# backend_template/services/project_template.py

from typing import Annotated, Sequence
from uuid import UUID

from fastapi import Depends, HTTPException, status

from backend_template.entities.project_template import (
    ProjectTemplateCreate,
    ProjectTemplateResponse,
    ProjectTemplateUpdate,
)
from backend_template.entities.events import (
    ProjectTemplateCreatedEvent,
    ProjectTemplateUpdatedEvent,
    ProjectTemplateDeletedEvent,
)
from backend_template.repositories.project_template import ProjectTemplateRepository
from backend_template.repositories.library_template import LibraryTemplateRepository
from backend_template.utils.broker import PROJECT_TEMPLATE_EVENTS_EXCHANGE, publish_event


class ProjectTemplateService:
    """
    Business Logic Layer for Project Templates.
    Orchestrates data flow between Controller (Schemas) and Repository (ORM).
    """

    def __init__(
        self,
        repo: Annotated[ProjectTemplateRepository, Depends(ProjectTemplateRepository)],
        library_repo: Annotated[LibraryTemplateRepository, Depends(LibraryTemplateRepository)],
    ):
        """
        :param repo: Injected ProjectTemplate Repository layer.
        :param library_repo: Injected LibraryTemplate Repository (for duplicate operations).
        Service does NOT touch the raw DB session.
        """
        self.repo = repo
        self.library_repo = library_repo

    async def create_template(
        self, payload: ProjectTemplateCreate
    ) -> ProjectTemplateResponse:
        """
        Creates a new ProjectTemplate.
        Input: Pydantic Schema
        Output: Pydantic Schema
        """
        # 1. Convert Schema to Dictionary for Repository
        # We model_dump to pass strict kwargs to the repo/ORM
        template_data = payload.model_dump()

        # 2. Call Repository (Returns ORM Model)
        orm_template = await self.repo.create(**template_data)

        # 3. Convert ORM Model -> Pydantic Schema (Prevention of Leak)
        response = ProjectTemplateResponse.model_validate(orm_template)

        # 4. Publish lifecycle event (best-effort — failures are only logged)
        await publish_event(
            PROJECT_TEMPLATE_EVENTS_EXCHANGE,
            ProjectTemplateCreatedEvent(
                template_id=response.id,
                project_id=response.project_id,
                name=response.name,
                description=response.description,
            ),
        )

        return response

    async def get_template(self, template_id: UUID) -> ProjectTemplateResponse:
        """
        Retrieves a template by ID.
        Raises 404 if not found.
        """
        # 1. Fetch from Repo
        orm_template = await self.repo.get_by_id(template_id)

        # 2. Handle Not Found (Business Logic)
        if not orm_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ProjectTemplate with ID {template_id} not found.",
            )

        # 3. Map to Response Schema
        return ProjectTemplateResponse.model_validate(orm_template)

    async def list_templates(
        self, skip: int = 0, limit: int = 100
    ) -> Sequence[ProjectTemplateResponse]:
        """
        Lists templates with pagination.
        """
        # 1. Fetch List from Repo
        orm_templates = await self.repo.get_all(skip=skip, limit=limit)

        # 2. Map List[ORM] -> List[Schema]
        return [
            ProjectTemplateResponse.model_validate(t) 
            for t in orm_templates
        ]

    async def get_templates_by_project(
        self, project_id: UUID
    ) -> Sequence[ProjectTemplateResponse]:
        """
        Retrieves all templates for a specific project ID.
        """
        orm_templates = await self.repo.get_by_project_id(project_id)
        return [
            ProjectTemplateResponse.model_validate(t) 
            for t in orm_templates
        ]

    async def update_template(
        self, template_id: UUID, payload: ProjectTemplateUpdate
    ) -> ProjectTemplateResponse:
        """
        Partially updates a template.
        """
        # 1. Check Existence first
        existing_template = await self.repo.get_by_id(template_id)
        if not existing_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ProjectTemplate with ID {template_id} not found.",
            )

        # 2. Extract updates (exclude_unset allows PATCH behavior)
        update_data = payload.model_dump(exclude_unset=True)

        # 3. Perform Update
        # Note: If no fields were sent, we just return the existing object
        updated_orm = await self.repo.update(template_id, **update_data)
        
        # 4. Map to Response
        response = ProjectTemplateResponse.model_validate(updated_orm)

        # 5. Publish lifecycle event (only if at least one field changed)
        if update_data:
            await publish_event(
                PROJECT_TEMPLATE_EVENTS_EXCHANGE,
                ProjectTemplateUpdatedEvent(
                    template_id=template_id,
                    project_id=response.project_id,
                    changed_fields=update_data,
                ),
            )

        return response

    async def delete_template(self, template_id: UUID) -> None:
        """
        Deletes a template.
        """
        # 1. Check Existence
        existing_template = await self.repo.get_by_id(template_id)
        if not existing_template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"ProjectTemplate with ID {template_id} not found.",
            )

        # 2. Execute Delete
        await self.repo.delete(template_id)

        # 3. Publish lifecycle event
        await publish_event(
            PROJECT_TEMPLATE_EVENTS_EXCHANGE,
            ProjectTemplateDeletedEvent(
                template_id=template_id,
                project_id=existing_template.project_id,
            ),
        )

    async def duplicate_from_library(
        self, library_template_id: UUID, project_id: UUID
    ) -> ProjectTemplateResponse:
        """
        Duplicates a read-only LibraryTemplate into a new editable ProjectTemplate.
        Copies name and graph_json from the source library template.
        """
        # 1. Fetch the source LibraryTemplate
        source = await self.library_repo.get_by_id(library_template_id)
        if not source:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"LibraryTemplate with ID {library_template_id} not found.",
            )

        # 2. Create a new ProjectTemplate with the copied data
        orm_template = await self.repo.create(
            project_id=project_id,
            name=source.name,
            description=source.description,
            current_graph_json=source.graph_json,
        )

        # 3. Return as Pydantic response
        response = ProjectTemplateResponse.model_validate(orm_template)

        # 4. Publish lifecycle event (best-effort)
        await publish_event(
            PROJECT_TEMPLATE_EVENTS_EXCHANGE,
            ProjectTemplateCreatedEvent(
                template_id=response.id,
                project_id=response.project_id,
                name=response.name,
                description=response.description,
            ),
        )

        return response
        