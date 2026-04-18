from typing import Annotated, Sequence
from uuid import UUID

from fastapi import Depends, HTTPException, status

from backend_template.entities.brand import BrandCreate, BrandResponse, BrandUpdate
from backend_template.repositories.brand import BrandRepository


class BrandService:
    """
    Business Logic Layer for Brand.
    Orchestrates data flow between Controller (Schemas) and Repository (ORM).

    Brand is a global/shared generation asset — not scoped to any project.
    Its description is later injected into prompts via {{brand_description}}.
    """

    def __init__(
        self,
        repo: Annotated[BrandRepository, Depends(BrandRepository)],
    ):
        self.repo = repo

    async def create_brand(self, payload: BrandCreate) -> BrandResponse:
        """Creates a new Brand."""
        brand_data = payload.model_dump()
        orm_brand = await self.repo.create(**brand_data)
        return BrandResponse.model_validate(orm_brand)

    async def get_brand(self, brand_id: UUID) -> BrandResponse:
        """Returns a Brand by ID. Raises 404 if not found."""
        orm_brand = await self.repo.get_by_id(brand_id)
        if not orm_brand:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Brand with ID {brand_id} not found.",
            )
        return BrandResponse.model_validate(orm_brand)

    async def list_brands(
        self, skip: int = 0, limit: int = 100
    ) -> Sequence[BrandResponse]:
        """Lists all Brands with pagination."""
        orm_brands = await self.repo.get_all(skip=skip, limit=limit)
        return [BrandResponse.model_validate(b) for b in orm_brands]

    async def update_brand(
        self, brand_id: UUID, payload: BrandUpdate
    ) -> BrandResponse:
        """Partially updates a Brand. Raises 404 if not found."""
        existing = await self.repo.get_by_id(brand_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Brand with ID {brand_id} not found.",
            )

        update_data = payload.model_dump(exclude_unset=True)
        updated_orm = await self.repo.update(brand_id, **update_data)
        return BrandResponse.model_validate(updated_orm)

    async def delete_brand(self, brand_id: UUID) -> None:
        """Deletes a Brand. Raises 404 if not found."""
        existing = await self.repo.get_by_id(brand_id)
        if not existing:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Brand with ID {brand_id} not found.",
            )
        await self.repo.delete(brand_id)
