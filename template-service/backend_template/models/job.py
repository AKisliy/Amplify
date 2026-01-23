import enum
from datetime import datetime

from sqlalchemy import String, Float, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID, ARRAY
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin

class JobStatus(str, enum.Enum):
    QUEUED = "QUEUED"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class Job(Base, CommonMixin):
    __tablename__ = "jobs"

    template_version_id: Mapped[str] = mapped_column(
        ForeignKey("template_versions.id"), 
        nullable=False
    )

    # Execution Mask: List of Node IDs to execute (Run Selected)
    # If None or Empty, assume Full Run.
    target_node_ids: Mapped[list[str] | None] = mapped_column(ARRAY(UUID(as_uuid=True)), nullable=True)

    # State & Cost
    status: Mapped[JobStatus] = mapped_column(
        String(20), 
        default=JobStatus.QUEUED, 
        nullable=False
    )
    total_cost: Mapped[float] = mapped_column(Float, default=0.0)
    
    # Worker Tracking
    worker_id: Mapped[str | None] = mapped_column(UUID(as_uuid=True), nullable=True)
    
    # Timings
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    template_version = relationship("TemplateVersion", back_populates="jobs")
    node_executions = relationship("NodeExecution", back_populates="job", cascade="all, delete-orphan")