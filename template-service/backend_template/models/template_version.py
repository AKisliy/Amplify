from sqlalchemy import String, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin

class TemplateVersion(Base, CommonMixin):
    __tablename__ = "template_versions"

    template_id: Mapped[str] = mapped_column(
        ForeignKey("project_templates.id", ondelete="CASCADE"), 
        nullable=False
    )
    
    # The Frozen Graph
    graph_json: Mapped[dict] = mapped_column(JSONB, nullable=False)
    
    # De-duplication Hash (e.g., SHA256 of the JSON)
    version_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # Relationships
    template = relationship("ProjectTemplate", back_populates="versions")
    jobs = relationship("Job", back_populates="template_version")