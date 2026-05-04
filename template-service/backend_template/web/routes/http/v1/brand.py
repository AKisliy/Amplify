from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from backend_template.entities.brand import BrandCreate, BrandResponse, BrandUpdate
from backend_template.services.brand import BrandService

router = APIRouter(prefix="/brands", tags=["Brands"])

Service = Annotated[BrandService, Depends(BrandService)]


@router.get(
    "/",
    response_model=list[BrandResponse],
    status_code=status.HTTP_200_OK,
    summary="List Brands",
)
async def list_brands(
    service: Service,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    """Lists all brands with pagination."""
    return await service.list_brands(skip=skip, limit=limit)


@router.get(
    "/{brand_id}",
    response_model=BrandResponse,
    status_code=status.HTTP_200_OK,
    summary="Get Brand by ID",
)
async def get_brand(brand_id: UUID, service: Service):
    """Returns a single brand by its UUID."""
    return await service.get_brand(brand_id)


@router.post(
    "/",
    response_model=BrandResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Brand",
)
async def create_brand(payload: BrandCreate, service: Service):
    """Creates a new brand."""
    return await service.create_brand(payload)


@router.patch(
    "/{brand_id}",
    response_model=BrandResponse,
    status_code=status.HTTP_200_OK,
    summary="Update Brand",
)
async def update_brand(brand_id: UUID, payload: BrandUpdate, service: Service):
    """Partially updates a brand. Only provided fields are changed."""
    return await service.update_brand(brand_id, payload)


@router.delete(
    "/{brand_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Brand",
)
async def delete_brand(brand_id: UUID, service: Service):
    """Deletes a brand by ID."""
    await service.delete_brand(brand_id)
