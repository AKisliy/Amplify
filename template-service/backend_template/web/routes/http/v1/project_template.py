from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from backend_template.entities.project_template import (
    ProjectTemplateCreate,
    ProjectTemplateResponse,
    ProjectTemplateUpdate,
)
from backend_template.services.project_template import ProjectTemplateService

# 1. Initialize Router with prefix and tags
# This ensures all routes start with /v1/templates
router = APIRouter(prefix="/templates", tags=["Project Templates"])

# 2. Define Dependency Injection Type Alias
# This makes the route signatures cleaner and ensures strict typing.
Service = Annotated[ProjectTemplateService, Depends(ProjectTemplateService)]

@router.post(
    "/",
    response_model=ProjectTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Project Template",
)
async def create_template(
    payload: ProjectTemplateCreate,
    service: Service,
):
    """
    Creates a new template container.
    - **payload**: The initial data (name, description, project_id).
    """
    return await service.create_template(payload)


@router.get(
    "/{template_id}",
    response_model=ProjectTemplateResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Template by ID",
)
async def get_template(
    template_id: UUID,
    service: Service,
):
    """
    Retrieves a specific template by its UUID.
    """
    return await service.get_template(template_id)


@router.get(
    "/",
    response_model=list[ProjectTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="List Templates",
)
async def list_templates(
    service: Service,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Max records to return"),
):
    """
    Lists templates with pagination.
    """
    return await service.list_templates(skip=skip, limit=limit)


@router.patch(
    "/{template_id}",
    response_model=ProjectTemplateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Template",
)
async def update_template(
    template_id: UUID,
    payload: ProjectTemplateUpdate,
    service: Service,
):
    """
    Partially updates a template (e.g., renaming or auto-saving graph JSON).
    Only fields sent in the payload will be updated.
    """
    return await service.update_template(template_id, payload)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Template",
)
async def delete_template(
    template_id: UUID,
    service: Service,
):
    """
    Deletes a template and all its associated history (versions/jobs).
    """
    await service.delete_template(template_id)
    # 204 No Content returns empty body
    return
