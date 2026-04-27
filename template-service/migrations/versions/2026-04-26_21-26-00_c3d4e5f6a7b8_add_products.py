"""add products

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-26 21:26:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "products",
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("brand_id", sa.UUID(), nullable=True),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["brand_id"],
            ["template_service.brands.id"],
            name=op.f("fk_products_brand_id_brands"),
            ondelete="SET NULL",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_products")),
        schema="template_service",
    )
    op.create_index(
        op.f("ix_template_service_products_brand_id"),
        "products", ["brand_id"], unique=False, schema="template_service",
    )

    op.create_table(
        "product_images",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("media_uuid", sa.UUID(), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["template_service.products.id"],
            name=op.f("fk_product_images_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_images")),
        schema="template_service",
    )
    op.create_index(
        op.f("ix_template_service_product_images_product_id"),
        "product_images", ["product_id"], unique=False, schema="template_service",
    )

    op.create_table(
        "product_store_links",
        sa.Column("product_id", sa.UUID(), nullable=False),
        sa.Column("platform", sa.String(50), nullable=False),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("id", sa.UUID(), server_default=sa.text("gen_random_uuid()"), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(
            ["product_id"],
            ["template_service.products.id"],
            name=op.f("fk_product_store_links_product_id_products"),
            ondelete="CASCADE",
        ),
        sa.PrimaryKeyConstraint("id", name=op.f("pk_product_store_links")),
        schema="template_service",
    )
    op.create_index(
        op.f("ix_template_service_product_store_links_product_id"),
        "product_store_links", ["product_id"], unique=False, schema="template_service",
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_template_service_product_store_links_product_id"), table_name="product_store_links", schema="template_service")
    op.drop_table("product_store_links", schema="template_service")

    op.drop_index(op.f("ix_template_service_product_images_product_id"), table_name="product_images", schema="template_service")
    op.drop_table("product_images", schema="template_service")

    op.drop_index(op.f("ix_template_service_products_brand_id"), table_name="products", schema="template_service")
    op.drop_table("products", schema="template_service")
