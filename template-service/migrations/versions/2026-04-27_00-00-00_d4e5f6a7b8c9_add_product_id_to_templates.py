"""add product_id to project_templates

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-04-27 00:00:00.000000
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "project_templates",
        sa.Column("product_id", UUID(as_uuid=True), nullable=True),
        schema="template_service",
    )


def downgrade() -> None:
    op.drop_column("project_templates", "product_id", schema="template_service")
