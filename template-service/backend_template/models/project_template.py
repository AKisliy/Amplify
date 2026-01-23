from sqlalchemy import String, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin

class ProjectTemplate(Base, CommonMixin):
    __tablename__ = "project_templates"

    # User Service Logic
    # We index project_id because we often query "Show me all templates for Project X"
    project_id: Mapped[str] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    
    # Metadata
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Auto-save state (The Draft)
    current_graph_json: Mapped[dict] = mapped_column(JSONB, nullable=False, server_default='{}')

    # Relationships
    # cascade="all, delete-orphan": If Template is deleted, delete all versions too.
    versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")