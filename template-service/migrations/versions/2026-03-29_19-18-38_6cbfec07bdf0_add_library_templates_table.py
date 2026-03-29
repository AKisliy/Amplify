"""add library templates table

Revision ID: 6cbfec07bdf0
Revises: 4c0e6da64c5e
Create Date: 2026-03-29 19:18:38.651972

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6cbfec07bdf0'
down_revision: Union[str, Sequence[str], None] = '4c0e6da64c5e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('library_templates',
    sa.Column('name', sa.String(length=255), nullable=False),
    sa.Column('description', sa.Text(), nullable=True),
    sa.Column('graph_json', postgresql.JSONB(astext_type=sa.Text()), server_default='{}', nullable=False),
    sa.Column('thumbnail_url', sa.Text(), nullable=True),
    sa.Column('id', sa.UUID(), server_default=sa.text('gen_random_uuid()'), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.PrimaryKeyConstraint('id', name=op.f('pk_library_templates')),
    schema='template_service'
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('library_templates', schema='template_service')
