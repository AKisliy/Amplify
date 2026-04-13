"""add_auto_list_ids_to_templates

Revision ID: a1b2c3d4e5f6
Revises: 7f3a9b2c1d4e
Create Date: 2026-04-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ARRAY, UUID

revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = '7f3a9b2c1d4e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'project_templates',
        sa.Column('auto_list_ids', ARRAY(UUID(as_uuid=True)), nullable=False, server_default='{}'),
        schema='template_service',
    )


def downgrade() -> None:
    op.drop_column('project_templates', 'auto_list_ids', schema='template_service')
