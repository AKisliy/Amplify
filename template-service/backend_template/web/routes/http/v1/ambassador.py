from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend_template.auth import _get_user_id
from backend_template.entities.ambassador import (
    AmbassadorCreate,
    AmbassadorResponse,
    AmbassadorUpdate,
    ReferenceImageCreate,
    ReferenceImageResponse,
)
from backend_template.services.ambassador import AmbassadorService

router = APIRouter(
    prefix="/ambassadors",
    tags=["Ambassadors"],
    dependencies=[Depends(_get_user_id)],
)

Service = Annotated[AmbassadorService, Depends(AmbassadorService)]


@router.post(
    "/",
    response_model=AmbassadorResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create ambassador for a project",
)
async def create_ambassador(payload: AmbassadorCreate, service: Service):
    return await service.create_ambassador(payload)


# NOTE: /project/{project_id} must be registered BEFORE /{ambassador_id}
@router.get(
    "/project/{project_id}",
    response_model=AmbassadorResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get ambassador by project ID",
)
async def get_ambassador_by_project(project_id: UUID, service: Service):
    return await service.get_ambassador_by_project(project_id)


@router.get(
    "/{ambassador_id}",
    response_model=AmbassadorResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get ambassador by ID",
)
async def get_ambassador(ambassador_id: UUID, service: Service):
    return await service.get_ambassador(ambassador_id)


@router.patch(
    "/{ambassador_id}",
    response_model=AmbassadorResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Update ambassador",
)
async def update_ambassador(
    ambassador_id: UUID, payload: AmbassadorUpdate, service: Service
):
    return await service.update_ambassador(ambassador_id, payload)


@router.delete(
    "/{ambassador_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete ambassador",
)
async def delete_ambassador(ambassador_id: UUID, service: Service):
    await service.delete_ambassador(ambassador_id)


# ------------------------------------------------------------------
# Reference images
# ------------------------------------------------------------------

@router.get(
    "/{ambassador_id}/images",
    response_model=list[ReferenceImageResponse],
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="List reference images",
)
async def list_reference_images(ambassador_id: UUID, service: Service):
    return await service.list_reference_images(ambassador_id)


@router.post(
    "/{ambassador_id}/images",
    response_model=ReferenceImageResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Add a reference image",
)
async def add_reference_image(
    ambassador_id: UUID, payload: ReferenceImageCreate, service: Service
):
    return await service.add_reference_image(ambassador_id, payload)


@router.delete(
    "/{ambassador_id}/images/{media_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a reference image",
)
async def delete_reference_image(
    ambassador_id: UUID, media_id: UUID, service: Service
):
    await service.delete_reference_image(ambassador_id, media_id)
