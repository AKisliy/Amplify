import uuid

from sqlalchemy import String, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin


class ProductImage(Base, CommonMixin):
    __tablename__ = "product_images"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_service.products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_uuid: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)


class ProductStoreLink(Base, CommonMixin):
    __tablename__ = "product_store_links"

    product_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_service.products.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    url: Mapped[str] = mapped_column(Text, nullable=False)


class Product(Base, CommonMixin):
    __tablename__ = "products"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Optional reference to a Brand (metadata only, not enforced by FK join at runtime)
    brand_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_service.brands.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    images: Mapped[list[ProductImage]] = relationship(
        "ProductImage",
        cascade="all, delete-orphan",
        lazy="noload",
    )
    store_links: Mapped[list[ProductStoreLink]] = relationship(
        "ProductStoreLink",
        cascade="all, delete-orphan",
        lazy="noload",
    )
