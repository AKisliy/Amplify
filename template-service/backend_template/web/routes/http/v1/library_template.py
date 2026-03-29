from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from backend_template.entities.library_template import LibraryTemplateResponse
from backend_template.services.library_template import LibraryTemplateService

# Public read-only routes for the Template Library
# Mounted at /v1/library-templates
router = APIRouter(prefix="/library-templates", tags=["Library Templates"])

# Dependency Injection Type Alias
Service = Annotated[LibraryTemplateService, Depends(LibraryTemplateService)]


# --- Public Endpoints (Read-Only) ---

@router.get(
    "/",
    response_model=list[LibraryTemplateResponse],
    status_code=status.HTTP_200_OK,
    summary="List Library Templates",
)
async def list_library_templates(
    service: Service,
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(100, ge=1, le=100, description="Max records to return"),
):
    """
    Lists all available library template cards with pagination.
    """
    return await service.list_templates(skip=skip, limit=limit)


@router.get(
    "/{template_id}",
    response_model=LibraryTemplateResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Library Template by ID",
)
async def get_library_template(
    template_id: UUID,
    service: Service,
):
    """
    Retrieves a specific library template by its UUID.
    """
    return await service.get_template(template_id)
