"""add node_result_cache table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-06-18 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "e5f6a7b8c9d0"
down_revision = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None

SCHEMA = "template_service"


def upgrade() -> None:
    op.create_table(
        "node_result_cache",
        sa.Column("input_hash", sa.Text(), nullable=False),
        sa.Column("class_type", sa.Text(), nullable=False),
        sa.Column("output", postgresql.JSONB(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint("input_hash", name="pk_node_result_cache"),
        schema=SCHEMA,
    )
    op.create_index(
        "ix_node_result_cache_expires_at",
        "node_result_cache",
        ["expires_at"],
        schema=SCHEMA,
    )


def downgrade() -> None:
    op.drop_index("ix_node_result_cache_expires_at", table_name="node_result_cache", schema=SCHEMA)
    op.drop_table("node_result_cache", schema=SCHEMA)
