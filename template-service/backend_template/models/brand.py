from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from sqlalchemy.orm import Mapped, mapped_column

from backend_template.database import Base
from backend_template.models.common import CommonMixin


class Brand(Base, CommonMixin):
    __tablename__ = "brands"

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # UUID reference to the logo asset stored in media-ingest service
    logo_image_uuid: Mapped[str | None] = mapped_column(
        PG_UUID(as_uuid=False), nullable=True
    )
