import enum
from sqlalchemy import String, Text, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from backend_template.database import Base
from backend_template.models.common import CommonMixin

class NodeStatus(str, enum.Enum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"

class NodeExecution(Base, CommonMixin):
    __tablename__ = "node_executions"

    job_id: Mapped[str] = mapped_column(
        ForeignKey("jobs.id", ondelete="CASCADE"), 
        nullable=False
    )

    # The ID from the JSON Graph (e.g., "550e8400-...")
    # This is NOT a foreign key to a table, it's a logical ID.
    node_id: Mapped[str] = mapped_column(UUID(as_uuid=True), nullable=False)
    
    class_name: Mapped[str] = mapped_column(String(100), nullable=False) # e.g. "VeoModel"

    # Inputs/Outputs
    status: Mapped[NodeStatus] = mapped_column(
        String(20), 
        default=NodeStatus.PENDING, 
        nullable=False
    )
    inputs: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    outputs: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    job = relationship("Job", back_populates="node_executions")

    # Constraints
    # Ensure a specific node is only executed once per Job
    __table_args__ = (
        UniqueConstraint('job_id', 'node_id', name='uq_job_node'),
    )