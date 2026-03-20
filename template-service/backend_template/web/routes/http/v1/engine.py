from typing import Annotated

from fastapi import APIRouter, Depends, status

from backend_template.services.engine_client import EngineClientService

router = APIRouter(prefix="/engine", tags=["Engine"])

Service = Annotated[EngineClientService, Depends(EngineClientService)]


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
