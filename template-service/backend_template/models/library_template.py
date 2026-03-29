from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend_template.database import Base
from backend_template.models.common import CommonMixin


class LibraryTemplate(Base, CommonMixin):
    __tablename__ = "library_templates"

    # Metadata
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The static ComfyUI-style node graph definition
    graph_json: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default='{}')

    # Thumbnail preview URL (signed HTTPS URL to GCS)
    thumbnail_url: Mapped[str | None] = mapped_column(Text, nullable=True)
