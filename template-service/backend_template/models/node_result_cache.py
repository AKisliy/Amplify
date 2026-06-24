from datetime import datetime

from sqlalchemy import DateTime, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from backend_template.database import Base


class NodeResultCache(Base):
    __tablename__ = "node_result_cache"

    # Content-addressable: sha256 of (class_type + sorted resolved inputs)
    input_hash: Mapped[str] = mapped_column(Text, primary_key=True)
    class_type: Mapped[str] = mapped_column(Text, nullable=False)
    output: Mapped[dict] = mapped_column(JSONB, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    __table_args__ = (
        Index("ix_node_result_cache_expires_at", "expires_at"),
    )
