"""add_execution_tracking_fields

Revision ID: 7f3a9b2c1d4e
Revises: 6cbfec07bdf0
Create Date: 2026-03-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '7f3a9b2c1d4e'
down_revision: Union[str, Sequence[str], None] = '6cbfec07bdf0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'template_versions',
        sa.Column('created_by', sa.String(length=255), nullable=True),
        schema='template_service',
    )
    op.add_column(
        'jobs',
        sa.Column('prompt_id', sa.String(length=255), nullable=True),
        schema='template_service',
    )


def downgrade() -> None:
    op.drop_column('template_versions', 'created_by', schema='template_service')
    op.drop_column('jobs', 'prompt_id', schema='template_service')
