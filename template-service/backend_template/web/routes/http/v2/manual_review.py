from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend_template.auth import _get_user_id
from backend_template.entities.manual_review import (
    ManualReviewCompleteRequest,
    ManualReviewTaskResponse,
)
from backend_template.services.manual_review import ManualReviewService

router = APIRouter(
    prefix="/review",
    tags=["Manual Review (v2)"],
    dependencies=[Depends(_get_user_id)],
)

Service = Annotated[ManualReviewService, Depends(ManualReviewService)]


@router.get(
    "/{task_id}",
    response_model=ManualReviewTaskResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get a review task by ID",
)
async def get_task(task_id: UUID, service: Service):
    return await service.get_task(task_id)


@router.post(
    "/{task_id}/complete",
    response_model=ManualReviewTaskResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Submit user decision and resume the Temporal workflow",
)
async def complete_task(task_id: UUID, payload: ManualReviewCompleteRequest, service: Service):
    return await service.complete_task_v2(task_id, payload)


@router.get(
    "/job/{job_id}/pending",
    response_model=ManualReviewTaskResponse | None,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get the pending review task for a job",
)
async def get_pending_by_job(job_id: UUID, service: Service):
    return await service.get_pending_by_job(job_id)


@router.get(
    "/job/{job_id}/node/{node_id}",
    response_model=ManualReviewTaskResponse | None,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get the review task for a specific job + node",
)
async def get_by_job_and_node(job_id: UUID, node_id: UUID, service: Service):
    return await service.get_by_job_and_node(job_id, node_id)
