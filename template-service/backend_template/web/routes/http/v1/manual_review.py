from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, status

from backend_template.auth import _get_user_id
from backend_template.entities.manual_review import (
    ManualReviewCompleteRequest,
    ManualReviewCreateRequest,
    ManualReviewTaskResponse,
    ShotRegenerateRequest,
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


@router.get(
    "/job/{job_id}/node/{node_id}",
    response_model=ManualReviewTaskResponse | None,
    response_model_by_alias=True,
    status_code=status.HTTP_200_OK,
    summary="Get the review task for a specific job + node (used by frontend to show UI)",
)
async def get_by_job_and_node(job_id: UUID, node_id: UUID, service: Service):
    return await service.get_by_job_and_node(job_id, node_id)


@router.post(
    "/{task_id}/regenerate-shot",
    response_model=ManualReviewTaskResponse,
    response_model_by_alias=True,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Trigger re-generation of a single shot with (optionally edited) params",
)
async def regenerate_shot(
    task_id: UUID,
    payload: ShotRegenerateRequest,
    service: Service,
    background_tasks: BackgroundTasks,
):
    """
    Marks ``payload.shots[slot_index].regen_status = "regenerating"`` immediately
    and returns 202.  A background task then calls the Veo API, registers the new
    clip with MediaIngest, and patches ``current_uuid`` + clears ``regen_status``.

    The frontend polls ``GET /review/{task_id}`` to detect the UUID swap
    (``regen_status: null`` + changed ``current_uuid``) and swap the player.
    """
    return await service.regenerate_shot(task_id, payload, background_tasks)

