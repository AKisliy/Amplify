from typing import Annotated, Sequence
from uuid import UUID

from fastapi import Depends, HTTPException, status

from backend_template.entities.product import (
    ProductCreate, ProductUpdate, ProductResponse,
    ProductImageCreate, ProductImageResponse,
    ProductStoreLinkCreate, ProductStoreLinkResponse,
    VALID_PLATFORMS,
)
from backend_template.repositories.product import (
    ProductRepository, ProductImageRepository, ProductStoreLinkRepository,
)


class ProductService:
    def __init__(
        self,
        repo: Annotated[ProductRepository, Depends(ProductRepository)],
        image_repo: Annotated[ProductImageRepository, Depends(ProductImageRepository)],
        link_repo: Annotated[ProductStoreLinkRepository, Depends(ProductStoreLinkRepository)],
    ):
        self.repo = repo
        self.image_repo = image_repo
        self.link_repo = link_repo

    # -- helpers ---------------------------------------------------------------

    async def _get_or_404(self, product_id: UUID):
        obj = await self.repo.get_by_id(product_id)
        if not obj:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Product {product_id} not found.",
            )
        return obj

    # -- product CRUD ----------------------------------------------------------

    async def list_products(self, skip: int = 0, limit: int = 100) -> Sequence[ProductResponse]:
        products = await self.repo.get_all(skip=skip, limit=limit)
        return [ProductResponse.model_validate(p) for p in products]

    async def get_product(self, product_id: UUID) -> ProductResponse:
        return ProductResponse.model_validate(await self._get_or_404(product_id))

    async def create_product(self, payload: ProductCreate) -> ProductResponse:
        orm = await self.repo.create(**payload.model_dump())
        return ProductResponse.model_validate(orm)

    async def update_product(self, product_id: UUID, payload: ProductUpdate) -> ProductResponse:
        await self._get_or_404(product_id)
        orm = await self.repo.update(product_id, **payload.model_dump(exclude_unset=True))
        return ProductResponse.model_validate(orm)

    async def delete_product(self, product_id: UUID) -> None:
        await self._get_or_404(product_id)
        await self.repo.delete(product_id)

    # -- images ----------------------------------------------------------------

    async def add_image(self, product_id: UUID, payload: ProductImageCreate) -> ProductImageResponse:
        await self._get_or_404(product_id)
        existing = await self.image_repo.get_by_product_and_media(product_id, payload.media_uuid)
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This image is already attached to the product.",
            )
        orm = await self.image_repo.create(
            product_id=product_id,
            media_uuid=payload.media_uuid,
        )
        return ProductImageResponse.model_validate(orm)

    async def remove_image(self, product_id: UUID, media_uuid: UUID) -> None:
        await self._get_or_404(product_id)
        image = await self.image_repo.get_by_product_and_media(product_id, media_uuid)
        if not image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Image not found on this product.",
            )
        await self.image_repo.delete(image.id)

    # -- store links -----------------------------------------------------------

    async def add_store_link(self, product_id: UUID, payload: ProductStoreLinkCreate) -> ProductStoreLinkResponse:
        await self._get_or_404(product_id)
        if payload.platform not in VALID_PLATFORMS:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Invalid platform. Must be one of: {', '.join(VALID_PLATFORMS)}",
            )
        orm = await self.link_repo.create(
            product_id=product_id,
            platform=payload.platform,
            url=payload.url,
        )
        return ProductStoreLinkResponse.model_validate(orm)

    async def remove_store_link(self, product_id: UUID, link_id: UUID) -> None:
        await self._get_or_404(product_id)
        link = await self.link_repo.get_by_id(link_id)
        if not link or link.product_id != product_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Store link not found on this product.",
            )
        await self.link_repo.delete(link_id)
