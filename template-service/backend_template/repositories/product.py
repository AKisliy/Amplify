from typing import Annotated, Sequence
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend_template.database import get_db
from backend_template.models.product import Product, ProductImage, ProductStoreLink
from backend_template.repositories.base import BaseRepository


class ProductRepository(BaseRepository[Product]):

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(Product, db)

    def _with_relations(self):
        return select(Product).options(
            selectinload(Product.images),
            selectinload(Product.store_links),
        )

    async def get_by_id(self, id: UUID) -> Product | None:
        query = self._with_relations().where(Product.id == id)
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(self, skip: int = 0, limit: int = 100) -> Sequence[Product]:
        query = self._with_relations().offset(skip).limit(limit)
        result = await self.db.execute(query)
        return result.scalars().all()

    async def create(self, **kwargs) -> Product:
        orm_obj = await super().create(**kwargs)
        return await self.get_by_id(orm_obj.id)


class ProductImageRepository(BaseRepository[ProductImage]):

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(ProductImage, db)

    async def get_by_product_and_media(
        self, product_id: UUID, media_uuid: UUID
    ) -> ProductImage | None:
        query = select(ProductImage).where(
            ProductImage.product_id == product_id,
            ProductImage.media_uuid == media_uuid,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()


class ProductStoreLinkRepository(BaseRepository[ProductStoreLink]):

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(ProductStoreLink, db)
