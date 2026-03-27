from typing import Annotated

from fastapi import APIRouter, Body, Depends, Query, status

from backend_template.entities.engine import (
    HistoryEntry,
    PromptRequest,
    PromptResponse,
)
from backend_template.services.engine_client import EngineClientService

router = APIRouter(prefix="/engine", tags=["Engine"])

Service = Annotated[EngineClientService, Depends(EngineClientService)]


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

