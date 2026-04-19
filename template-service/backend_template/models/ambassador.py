import uuid

from sqlalchemy import String, Text, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin


class ReferenceImage(Base, CommonMixin):
    __tablename__ = "ambassador_reference_images"

    ambassador_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("template_service.ambassadors.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    media_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
    )
    # "portrait" | "full_body" | "other"
    image_type: Mapped[str] = mapped_column(String(20), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "image_type IN ('portrait', 'full_body', 'other')",
            name="ck_image_type_valid",
        ),
    )


class Ambassador(Base, CommonMixin):
    __tablename__ = "ambassadors"

    project_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        nullable=False,
        unique=True,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)

    appearance_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    voice_id: Mapped[str | None] = mapped_column(String(255), nullable=True)

    reference_images = relationship(
        "ReferenceImage",
        cascade="all, delete-orphan",
        lazy="noload",  # always load explicitly via selectinload
    )
