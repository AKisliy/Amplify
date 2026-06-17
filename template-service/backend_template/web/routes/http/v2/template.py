from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, status

from backend_template.auth import CurrentUserId, _get_user_id
from backend_template.services.job import JobService

# router = APIRouter(prefix="/templates", tags=["Templates v2"], dependencies=[Depends(_get_user_id)])
router = APIRouter(prefix="/templates", tags=["Templates v2"], dependencies=[])

JobSvc = Annotated[JobService, Depends(JobService)]


@router.post(
    "/{template_id}/run",
    status_code=status.HTTP_202_ACCEPTED,
    summary="Run a template via Temporal",
)
async def run_template(
    template_id: UUID,
    service: JobSvc,
    # user_id: CurrentUserId,
):
    """
    Snapshots the template graph, creates a Job record, and submits execution
    to Temporal. Returns immediately with the job_id.
    """
    user_id = ""
    result = await service.run_template_temporal(template_id, user_id=user_id)
    return {"job_id": result.job_id}
