"""Temporal worker startup."""
import asyncio
import logging

from temporalio.worker import Worker

from backend_template.config import settings
from backend_template.database import async_session_maker
from backend_template.temporal.cache import init_cache
from backend_template.temporal.client import get_temporal_client
from backend_template.temporal.registry import init_registry
from backend_template.temporal.activities.node import execute_node
from backend_template.temporal.activities.hitl import hitl_setup, hitl_finalize
from backend_template.temporal.workflows.graph import (
    GraphWorkflow,
    _publish_job_started,
    _publish_job_finished,
)

logger = logging.getLogger(__name__)


async def run_worker() -> None:
    """Start the Temporal worker. Can be called from lifespan or as a standalone process."""
    # Discover all IO.ComfyNode classes from comfy_api_nodes/nodes_*.py —
    # same dynamic loading as ComfyUI's init_builtin_api_nodes().
    await init_registry()

    if settings.cache_enabled:
        logger.info("Enabling cache, since config has cache_enabled=True")
        init_cache(async_session_maker)

    client = await get_temporal_client()
    worker = Worker(
        client,
        task_queue=settings.temporal_task_queue,
        workflows=[GraphWorkflow],
        # execute_node is dynamic=True — handles all regular node class_types by name.
        # hitl_setup / hitl_finalize are generic named activities for HITL nodes.
        # _publish_job_started/_publish_job_finished are named activities.
        activities=[execute_node, hitl_setup, hitl_finalize, _publish_job_started, _publish_job_finished],
    )
    logger.info("Temporal worker started on task queue %r", settings.temporal_task_queue)
    await worker.run()


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_worker())
