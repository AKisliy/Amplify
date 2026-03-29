from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend_template.entities.library_template import (
    LibraryTemplateCreate,
    LibraryTemplateResponse,
    LibraryTemplateUpdate,
)
from backend_template.services.library_template import LibraryTemplateService

# Internal CRUD routes for managing the Template Library
# Mounted at /internal/library-templates
router = APIRouter(prefix="/library-templates", tags=["Library Templates (Internal)"])

# Dependency Injection Type Alias
Service = Annotated[LibraryTemplateService, Depends(LibraryTemplateService)]


# --- Internal Endpoints (Admin CRUD) ---

@router.post(
    "/",
    response_model=LibraryTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a Library Template",
)
async def create_library_template(
    payload: LibraryTemplateCreate,
    service: Service,
):
    """
    Creates a new library template card (internal use only).
    """
    return await service.create_template(payload)


@router.patch(
    "/{template_id}",
    response_model=LibraryTemplateResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a Library Template",
)
async def update_library_template(
    template_id: UUID,
    payload: LibraryTemplateUpdate,
    service: Service,
):
    """
    Partially updates a library template (internal use only).
    Only fields sent in the payload will be updated.
    """
    return await service.update_template(template_id, payload)


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Library Template",
)
async def delete_library_template(
    template_id: UUID,
    service: Service,
):
    """
    Deletes a library template from the library (internal use only).
    """
    await service.delete_template(template_id)
    # 204 No Content returns empty body
    return
