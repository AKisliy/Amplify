from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query, status

from backend_template.auth import CurrentUserId, _get_user_id
from backend_template.entities.engine import (
    HistoryEntry,
    InterruptRequest,
    PromptRequest,
    PromptResponse,
    QueueInfoResponse,
    QueueManageRequest,
)
from backend_template.entities.job import (
    JobDetailResponse,
    RunTemplateRequest,
    RunTemplateResponse,
)
from backend_template.services.engine_client import EngineClientService
from backend_template.services.job import JobService

# router = APIRouter(prefix="/engine", tags=["Engine"], dependencies=[Depends(_get_user_id)])
router = APIRouter(prefix="/engine", tags=["Engine"])



Service = Annotated[EngineClientService, Depends(EngineClientService)]
JobSvc = Annotated[JobService, Depends(JobService)]


# ── Node Info ─────────────────────────────────────────────────────────────


@router.get(
    "/nodes",
    status_code=status.HTTP_200_OK,
    summary="Get all node schemas",
)
async def get_all_nodes(
    service: Service,
):
    """
    Returns the full schema (inputs, outputs, metadata) for every
    registered node in the engine.
    """
    return await service.get_all_node_info()


@router.get(
    "/nodes/{node_class}",
    status_code=status.HTTP_200_OK,
    summary="Get a single node schema",
)
async def get_node(
    node_class: str,
    service: Service,
):
    """
    Returns the schema for a specific node class by name
    (e.g., `GeminiNode`, `VeoVideoGenerationNode`).
    """
    return await service.get_node_info(node_class)


# ── Template Execution ────────────────────────────────────────────────────


@router.post(
    "/run",
    response_model=RunTemplateResponse,
    status_code=status.HTTP_202_ACCEPTED,
    summary="Run a template",
)
async def run_template(
    payload: RunTemplateRequest,
    service: JobSvc,
    # user_id: CurrentUserId,
):
    """
    Snapshots the template's current graph into a TemplateVersion, creates a
    Job + NodeExecution records, submits the graph to engine, and streams
    node status updates via RabbitMQ → WebSocket Gateway → frontend.
    Returns immediately with job_id and prompt_id.

    Raises **422 Unprocessable Entity** if the graph contains validation
    errors (e.g. missing required inputs, type mismatches).  The response
    body includes a structured ``node_errors`` dict so the frontend can
    highlight the broken nodes.
    """
    user_id = "0e7886ac-e555-4b3a-ae7a-974a9941aad8"
    return await service.run_template(payload.template_id, user_id=user_id)


# ── Job Details (DB Read) ────────────────────────────────────────────────


@router.get(
    "/jobs/{job_id}",
    response_model=JobDetailResponse,
    status_code=status.HTTP_200_OK,
    summary="Get full job details",
)
async def get_job_detail(
    job_id: UUID,
    service: JobSvc,
):
    """
    Returns the persistent job record with all node execution states.
    Used by the frontend on page reload to reconstruct execution state
    from the DB rather than relying on volatile WS/cache state.
    """
    return await service.get_job_detail(job_id)


# ── Queue (Engine Proxy) ─────────────────────────────────────────────────


@router.get(
    "/queue",
    response_model=QueueInfoResponse,
    status_code=status.HTTP_200_OK,
    summary="Get queue information",
)
async def get_queue(
    service: Service,
):
    """
    Returns a snapshot of the engine's volatile prompt queue:
    currently running prompt(s) and pending prompts ordered by priority.
    """
    data = await service.get_queue()
    return QueueInfoResponse.model_validate(data)


@router.post(
    "/queue",
    status_code=status.HTTP_200_OK,
    summary="Manage queue operations",
)
async def manage_queue(
    payload: QueueManageRequest,
    service: Service,
):
    """
    Cancel specific pending prompts by prompt_id or clear the entire
    pending queue.  Only affects pending prompts — to stop a running
    graph, use ``POST /interrupt``.
    """
    await service.manage_queue(clear=payload.clear, delete=payload.delete)


# ── Interrupt (Engine Proxy) ─────────────────────────────────────────────


@router.post(
    "/interrupt",
    status_code=status.HTTP_200_OK,
    summary="Interrupt currently running job",
)
async def interrupt(
    service: Service,
    payload: InterruptRequest | None = None,
):
    """
    Sends an interrupt signal to the engine.  If ``prompt_id`` is provided,
    only that specific prompt is interrupted (if it is currently running).
    Otherwise, a global interrupt is issued.

    The engine sets ``processing_interrupted()`` flag, which causes
    ``sleep_with_interrupt`` to raise ``ProcessingInterrupted`` in the
    active node's retry/poll loop.
    """
    prompt_id = payload.prompt_id if payload else None
    await service.interrupt(prompt_id=prompt_id)


# ── Prompt Submission ─────────────────────────────────────────────────────


@router.post(
    "/prompt",
    response_model=PromptResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit a workflow for execution",
)
async def submit_prompt(
    payload: PromptRequest,
    service: Service,
):
    """
    Submits a workflow graph for asynchronous execution on the engine.
    Returns immediately with a `prompt_id` — poll
    `GET /history/{prompt_id}` for results.
    """
    return await service.submit_prompt(payload)


# ── History ───────────────────────────────────────────────────────────────


@router.get(
    "/history/{prompt_id}",
    response_model=HistoryEntry | None,
    status_code=status.HTTP_200_OK,
    summary="Get execution history for a prompt",
)
async def get_prompt_history(
    prompt_id: str,
    service: Service,
):
    """
    Returns the execution history entry for a specific prompt_id.
    Returns null if no history exists for that prompt.
    """
    return await service.get_prompt_history(prompt_id)


@router.get(
    "/history",
    response_model=list[HistoryEntry],
    status_code=status.HTTP_200_OK,
    summary="List execution history",
)
async def get_all_history(
    service: Service,
    max_items: int | None = Query(default=None, ge=1),
    offset: int | None = Query(default=None),
):
    """
    Returns execution history for all prompts.
    Supports optional pagination via `max_items` and `offset`.
    """
    return await service.get_all_history(max_items=max_items, offset=offset)


@router.post(
    "/history",
    status_code=status.HTTP_200_OK,
    summary="Clear or delete history entries",
)
async def clear_history(
    service: Service,
    clear: bool | None = Body(default=None),
    delete: list[str] | None = Body(default=None),
):
    """
    Clears all execution history (if `clear=true`) and/or deletes
    specific entries by prompt_id (if `delete` list is provided).
    """
    await service.clear_history(clear=clear, delete=delete)


