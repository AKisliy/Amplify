from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status

from backend_template.entities.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductImageCreate, ProductImageResponse,
    ProductStoreLinkCreate, ProductStoreLinkResponse,
)
from backend_template.services.product import ProductService

router = APIRouter(prefix="/products", tags=["Products"])

Service = Annotated[ProductService, Depends(ProductService)]


# -- Product CRUD -------------------------------------------------------------

@router.get("/", response_model=list[ProductResponse], status_code=status.HTTP_200_OK)
async def list_products(
    service: Service,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=100),
):
    return await service.list_products(skip=skip, limit=limit)


@router.post("/", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
async def create_product(payload: ProductCreate, service: Service):
    return await service.create_product(payload)


@router.get("/{product_id}", response_model=ProductResponse, status_code=status.HTTP_200_OK)
async def get_product(product_id: UUID, service: Service):
    return await service.get_product(product_id)


@router.patch("/{product_id}", response_model=ProductResponse, status_code=status.HTTP_200_OK)
async def update_product(product_id: UUID, payload: ProductUpdate, service: Service):
    return await service.update_product(product_id, payload)


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_product(product_id: UUID, service: Service):
    await service.delete_product(product_id)


# -- Images -------------------------------------------------------------------

@router.post(
    "/{product_id}/images",
    response_model=ProductImageResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_image(product_id: UUID, payload: ProductImageCreate, service: Service):
    return await service.add_image(product_id, payload)


@router.delete("/{product_id}/images/{media_uuid}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_image(product_id: UUID, media_uuid: UUID, service: Service):
    await service.remove_image(product_id, media_uuid)


# -- Store links --------------------------------------------------------------

@router.post(
    "/{product_id}/links",
    response_model=ProductStoreLinkResponse,
    status_code=status.HTTP_201_CREATED,
)
async def add_store_link(product_id: UUID, payload: ProductStoreLinkCreate, service: Service):
    return await service.add_store_link(product_id, payload)


@router.delete("/{product_id}/links/{link_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_store_link(product_id: UUID, link_id: UUID, service: Service):
    await service.remove_store_link(product_id, link_id)
