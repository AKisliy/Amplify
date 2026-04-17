"""remove_unused_ambassador_columns

Revision ID: c5d6e7f8a9b1
Revises: b3c4d5e6f7a8
Create Date: 2026-04-17 21:20:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c5d6e7f8a9b1"
down_revision: Union[str, None] = "b3c4d5e6f7a8"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('ambassadors', 'biography', schema='template_service')
    op.drop_column('ambassadors', 'behavioral_patterns', schema='template_service')

    op.add_column(
        'ambassadors',
        sa.Column("voice_description", sa.Text(), nullable=True),
        schema='template_service',
    )


def downgrade() -> None:
    op.drop_column('ambassadors', 'voice_description', schema='template_service')

    op.add_column(
        'ambassadors',
        sa.Column('biography', sa.Text(), nullable=True),
        schema='template_service',
    )
    op.add_column(
        'ambassadors',
        sa.Column('behavioral_patterns', sa.Text(), nullable=True),
        schema='template_service',
    )
