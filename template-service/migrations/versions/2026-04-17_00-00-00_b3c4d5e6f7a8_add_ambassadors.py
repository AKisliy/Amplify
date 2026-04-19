"""add_ambassadors

Revision ID: b3c4d5e6f7a8
Revises: a1b2c3d4e5f6
Create Date: 2026-04-17 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "b3c4d5e6f7a8"
down_revision: Union[str, None] = "a1b2c3d4e5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "ambassadors",
        sa.Column("project_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("biography", sa.Text(), nullable=True),
        sa.Column("behavioral_patterns", sa.Text(), nullable=True),
        sa.Column("appearance_description", sa.Text(), nullable=True),
        sa.Column("voice_id", sa.String(255), nullable=True),
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ambassadors")),
        sa.UniqueConstraint("project_id", name=op.f("uq_ambassadors_project_id")),
        schema="template_service",
    )
    op.create_index(
        op.f("ix_template_service_ambassadors_project_id"),
        "ambassadors",
        ["project_id"],
        unique=True,
        schema="template_service",
    )

    op.create_table(
        "ambassador_reference_images",
        sa.Column("ambassador_id", sa.UUID(), nullable=False),
        sa.Column("media_id", sa.UUID(), nullable=False),
        sa.Column("image_type", sa.String(20), nullable=False),
        sa.Column(
            "id",
            sa.UUID(),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(
            ["ambassador_id"],
            ["template_service.ambassadors.id"],
            name=op.f("fk_ambassador_reference_images_ambassador_id_ambassadors"),
            ondelete="CASCADE",
        ),
        sa.CheckConstraint(
            "image_type IN ('portrait', 'full_body', 'other')",
            name=op.f("ck_ambassador_reference_images_ck_image_type_valid"),
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_ambassador_reference_images")),
        schema="template_service",
    )
    op.create_index(
        op.f("ix_template_service_ambassador_reference_images_ambassador_id"),
        "ambassador_reference_images",
        ["ambassador_id"],
        unique=False,
        schema="template_service",
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_template_service_ambassador_reference_images_ambassador_id"),
        table_name="ambassador_reference_images",
        schema="template_service",
    )
    op.drop_table("ambassador_reference_images", schema="template_service")

    op.drop_index(
        op.f("ix_template_service_ambassadors_project_id"),
        table_name="ambassadors",
        schema="template_service",
    )
    op.drop_table("ambassadors", schema="template_service")
