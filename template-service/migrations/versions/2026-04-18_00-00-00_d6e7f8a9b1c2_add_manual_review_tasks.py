"""add_manual_review_tasks

Revision ID: d6e7f8a9b1c2
Revises: c5d6e7f8a9b1
Create Date: 2026-04-18 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import UUID, JSONB

revision: str = "d6e7f8a9b1c2"
down_revision: Union[str, None] = "c5d6e7f8a9b1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "manual_review_tasks",
        sa.Column("id", UUID(as_uuid=True), primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("job_id", UUID(as_uuid=True), sa.ForeignKey("template_service.jobs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("node_id", UUID(as_uuid=True), nullable=False),
        sa.Column("node_type", sa.String(64), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("auto_confirm", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("payload", JSONB(), nullable=False, server_default="{}"),
        sa.Column("decision", JSONB(), nullable=True),
        schema="template_service",
    )
    op.create_index(
        "ix_manual_review_tasks_job_id",
        "manual_review_tasks",
        ["job_id"],
        schema="template_service",
    )
    op.create_index(
        "ix_manual_review_tasks_node_type",
        "manual_review_tasks",
        ["node_type"],
        schema="template_service",
    )


def downgrade() -> None:
    op.drop_index("ix_manual_review_tasks_node_type", table_name="manual_review_tasks", schema="template_service")
    op.drop_index("ix_manual_review_tasks_job_id", table_name="manual_review_tasks", schema="template_service")
    op.drop_table("manual_review_tasks", schema="template_service")
