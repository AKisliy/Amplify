"""add_post_description_config_to_templates

Revision ID: e7f8a9b1c2d3
Revises: d6e7f8a9b1c2
Create Date: 2026-04-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = 'e7f8a9b1c2d3'
down_revision: Union[str, Sequence[str], None] = 'd6e7f8a9b1c2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        'project_templates',
        sa.Column('post_description_config', JSONB, nullable=True),
        schema='template_service',
    )


def downgrade() -> None:
    op.drop_column('project_templates', 'post_description_config', schema='template_service')
