from sqlalchemy import String, Boolean, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin


class ManualReviewStatus(str):
    PENDING = "pending"
    COMPLETED = "completed"
    AUTO_CONFIRMED = "auto_confirmed"


class ManualReviewTask(Base, CommonMixin):
    __tablename__ = "manual_review_tasks"

    job_id: Mapped[str] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("jobs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # Which node in the graph created this task
    node_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)

    # Free-form type string — e.g. "shot_trim", "approval"
    node_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # "pending" | "completed" | "auto_confirmed"
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")

    # When True the node resolves immediately with default decision (no human needed)
    auto_confirm: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    # Data the node exposes to the frontend (read-only for the user)
    payload: Mapped[dict] = mapped_column(JSONB, nullable=False, default=dict)

    # Data the user submits back (null until resolved)
    decision: Mapped[dict | None] = mapped_column(JSONB, nullable=True)

    job = relationship("Job", foreign_keys=[job_id])
