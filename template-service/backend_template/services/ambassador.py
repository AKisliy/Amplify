from typing import Annotated
from uuid import UUID

from fastapi import Depends, HTTPException, status
from sqlalchemy.exc import IntegrityError

from backend_template.entities.ambassador import (
    AmbassadorCreate,
    AmbassadorResponse,
    AmbassadorUpdate,
    ReferenceImageCreate,
    ReferenceImageResponse,
)
from backend_template.repositories.ambassador import (
    AmbassadorRepository,
    ReferenceImageRepository,
)


class AmbassadorService:

    def __init__(
        self,
        repo: Annotated[AmbassadorRepository, Depends(AmbassadorRepository)],
        image_repo: Annotated[ReferenceImageRepository, Depends(ReferenceImageRepository)],
    ):
        self.repo = repo
        self.image_repo = image_repo

    async def create_ambassador(self, payload: AmbassadorCreate) -> AmbassadorResponse:
        try:
            orm_obj = await self.repo.create(**payload.model_dump())
        except IntegrityError:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=f"Ambassador for project {payload.project_id} already exists.",
            )
        return AmbassadorResponse.model_validate(orm_obj)

    async def get_ambassador(self, ambassador_id: UUID) -> AmbassadorResponse:
        orm_obj = await self.repo.get_by_id(ambassador_id)
        if not orm_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
        return AmbassadorResponse.model_validate(orm_obj)

    async def get_ambassador_by_project(self, project_id: UUID) -> AmbassadorResponse:
        orm_obj = await self.repo.get_by_project_id(project_id)
        if not orm_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
        return AmbassadorResponse.model_validate(orm_obj)

    async def update_ambassador(
        self, ambassador_id: UUID, payload: AmbassadorUpdate
    ) -> AmbassadorResponse:
        existing = await self.repo.get_by_id(ambassador_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
        update_data = payload.model_dump(exclude_unset=True)
        updated = await self.repo.update(ambassador_id, **update_data)
        # repo.update returns without images loaded — re-fetch
        return await self.get_ambassador(ambassador_id)

    async def delete_ambassador(self, ambassador_id: UUID) -> None:
        existing = await self.repo.get_by_id(ambassador_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
        await self.repo.delete(ambassador_id)

    # ------------------------------------------------------------------
    # Reference images
    # ------------------------------------------------------------------

    async def add_reference_image(
        self, ambassador_id: UUID, payload: ReferenceImageCreate
    ) -> ReferenceImageResponse:
        existing = await self.repo.get_by_id(ambassador_id)
        if not existing:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
        orm_image = await self.image_repo.create(
            ambassador_id=ambassador_id,
            media_id=payload.media_id,
            image_type=payload.image_type,
        )
        return ReferenceImageResponse.model_validate(orm_image)

    async def delete_reference_image(self, ambassador_id: UUID, media_id: UUID) -> None:
        orm_image = await self.image_repo.get_by_ambassador_and_media(ambassador_id, media_id)
        if not orm_image:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Reference image not found.",
            )
        await self.image_repo.delete(orm_image.id)

    async def list_reference_images(self, ambassador_id: UUID) -> list[ReferenceImageResponse]:
        orm_obj = await self.repo.get_by_id(ambassador_id)
        if not orm_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Ambassador not found.")
        return [ReferenceImageResponse.model_validate(img) for img in orm_obj.reference_images]
