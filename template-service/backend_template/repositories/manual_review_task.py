import json
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db
from backend_template.models.manual_review_task import ManualReviewTask
from backend_template.repositories.base import BaseRepository


class ManualReviewTaskRepository(BaseRepository[ManualReviewTask]):

    def __init__(self, db: Annotated[AsyncSession, Depends(get_db)]):
        super().__init__(ManualReviewTask, db)

    async def get_pending_by_job(self, job_id: UUID) -> ManualReviewTask | None:
        query = select(ManualReviewTask).where(
            ManualReviewTask.job_id == job_id,
            ManualReviewTask.status == "pending",
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_job_and_node(self, job_id: UUID, node_id: UUID) -> ManualReviewTask | None:
        query = select(ManualReviewTask).where(
            ManualReviewTask.job_id == job_id,
            ManualReviewTask.node_id == node_id,
        )
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    # ── Atomic JSONB slot operations (concurrent-safe) ────────────────────────

    async def set_slot_regen_status(
        self,
        task_id: UUID,
        slot_index: int,
        status: str,
    ) -> None:
        """Atomically set ``payload.shots[slot_index].regen_status``.

        Single SQL statement — safe under concurrent ``BackgroundTask`` writes
        because PostgreSQL re-evaluates ``payload`` after acquiring the row lock.
        """
        await self.db.execute(
            text("""
                UPDATE manual_review_tasks
                SET payload = jsonb_set(
                    payload,
                    :path,
                    :value::jsonb
                )
                WHERE id = :task_id
            """),
            {
                "path": f"{{shots,{slot_index},regen_status}}",
                "value": json.dumps(status),
                "task_id": str(task_id),
            },
        )
        await self.db.commit()

    async def complete_slot_regen(
        self,
        task_id: UUID,
        slot_index: int,
        new_uuid: str,
        new_prompt: str,
    ) -> None:
        """Atomically update ``current_uuid``, ``gen_params.prompt``, and clear
        ``regen_status`` / ``regen_error`` for a single slot.
        """
        await self.db.execute(
            text("""
                UPDATE manual_review_tasks
                SET payload = jsonb_set(
                    jsonb_set(
                        jsonb_set(
                            jsonb_set(
                                payload,
                                :uuid_path,
                                :uuid_val::jsonb
                            ),
                            :prompt_path,
                            :prompt_val::jsonb
                        ),
                        :status_path,
                        'null'::jsonb
                    ),
                    :error_path,
                    'null'::jsonb
                )
                WHERE id = :task_id
            """),
            {
                "uuid_path":   f"{{shots,{slot_index},current_uuid}}",
                "uuid_val":    json.dumps(new_uuid),
                "prompt_path": f"{{shots,{slot_index},gen_params,prompt}}",
                "prompt_val":  json.dumps(new_prompt),
                "status_path": f"{{shots,{slot_index},regen_status}}",
                "error_path":  f"{{shots,{slot_index},regen_error}}",
                "task_id":     str(task_id),
            },
        )
        await self.db.commit()

    async def fail_slot_regen(
        self,
        task_id: UUID,
        slot_index: int,
        error_message: str,
    ) -> None:
        """Atomically set ``regen_status`` to ``"failed"`` and store the error."""
        await self.db.execute(
            text("""
                UPDATE manual_review_tasks
                SET payload = jsonb_set(
                    jsonb_set(
                        payload,
                        :status_path,
                        :status_val::jsonb
                    ),
                    :error_path,
                    :error_val::jsonb
                )
                WHERE id = :task_id
            """),
            {
                "status_path": f"{{shots,{slot_index},regen_status}}",
                "status_val":  json.dumps("failed"),
                "error_path":  f"{{shots,{slot_index},regen_error}}",
                "error_val":   json.dumps(error_message),
                "task_id":     str(task_id),
            },
        )
        await self.db.commit()
