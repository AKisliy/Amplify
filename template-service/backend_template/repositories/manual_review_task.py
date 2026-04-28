import json
from typing import Annotated
from uuid import UUID

from fastapi import Depends
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from backend_template.database import get_db
from backend_template.models.manual_review_task import ManualReviewTask
from backend_template.repositories.base import BaseRepository

# Schema-qualified table name (e.g. 'template_service.manual_review_tasks')
_SCHEMA = ManualReviewTask.metadata.schema
_TABLE = f"{_SCHEMA}.{ManualReviewTask.__tablename__}" if _SCHEMA else ManualReviewTask.__tablename__


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
    #
    # Uses raw SQL text() with CAST() to avoid asyncpg parameter binding
    # conflicts with PostgreSQL's :: cast operator.  The table name is resolved
    # from the ORM model so schema changes propagate automatically.

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
            text(f"""
                UPDATE {_TABLE}
                SET payload = jsonb_set(
                    payload,
                    CAST(:path AS text[]),
                    CAST(:value AS jsonb)
                )
                WHERE id = CAST(:task_id AS uuid)
            """),
            {
                "path": ["shots", str(slot_index), "regen_status"],
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
            text(f"""
                UPDATE {_TABLE}
                SET payload = jsonb_set(
                    jsonb_set(
                        jsonb_set(
                            jsonb_set(
                                payload,
                                CAST(:uuid_path AS text[]),
                                CAST(:uuid_val AS jsonb)
                            ),
                            CAST(:prompt_path AS text[]),
                            CAST(:prompt_val AS jsonb)
                        ),
                        CAST(:status_path AS text[]),
                        CAST('null' AS jsonb)
                    ),
                    CAST(:error_path AS text[]),
                    CAST('null' AS jsonb)
                )
                WHERE id = CAST(:task_id AS uuid)
            """),
            {
                "uuid_path":   ["shots", str(slot_index), "current_uuid"],
                "uuid_val":    json.dumps(new_uuid),
                "prompt_path": ["shots", str(slot_index), "gen_params", "prompt"],
                "prompt_val":  json.dumps(new_prompt),
                "status_path": ["shots", str(slot_index), "regen_status"],
                "error_path":  ["shots", str(slot_index), "regen_error"],
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
            text(f"""
                UPDATE {_TABLE}
                SET payload = jsonb_set(
                    jsonb_set(
                        payload,
                        CAST(:status_path AS text[]),
                        CAST(:status_val AS jsonb)
                    ),
                    CAST(:error_path AS text[]),
                    CAST(:error_val AS jsonb)
                )
                WHERE id = CAST(:task_id AS uuid)
            """),
            {
                "status_path": ["shots", str(slot_index), "regen_status"],
                "status_val":  json.dumps("failed"),
                "error_path":  ["shots", str(slot_index), "regen_error"],
                "error_val":   json.dumps(error_message),
                "task_id":     str(task_id),
            },
        )
        await self.db.commit()
