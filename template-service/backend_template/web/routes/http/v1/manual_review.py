from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend_template.auth import _get_user_id
from backend_template.entities.manual_review import (
    ManualReviewCompleteRequest,
    ManualReviewCreateRequest,
    ManualReviewTaskResponse,
)
from backend_template.services.manual_review import ManualReviewService

router = APIRouter(
    prefix="/review",
    tags=["Manual Review"],
    dependencies=[Depends(_get_user_id)],
)

Service = Annotated[ManualReviewService, Depends(ManualReviewService)]


@router.post(
    "/",
    response_model=ManualReviewTaskResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_201_CREATED,
    summary="Create a manual review task (called by nodes)",
)
async def create_task(payload: ManualReviewCreateRequest, service: Service):
    return await service.create_task(payload)


@router.get(
    "/{task_id}",
    response_model=ManualReviewTaskResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get review task status (polled by nodes)",
)
async def get_task(task_id: UUID, service: Service):
    return await service.get_task(task_id)


@router.post(
    "/{task_id}/complete",
    response_model=ManualReviewTaskResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Submit user decision for a review task",
)
async def complete_task(task_id: UUID, payload: ManualReviewCompleteRequest, service: Service):
    return await service.complete_task(task_id, payload)


@router.get(
    "/job/{job_id}/pending",
    response_model=ManualReviewTaskResponse | None,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get the pending review task for a job (used by frontend to show UI)",
)
async def get_pending_by_job(job_id: UUID, service: Service):
    return await service.get_pending_by_job(job_id)
