import uuid
from datetime import datetime
from sqlalchemy import String, Text, DateTime, ForeignKey, Integer, func, JSON
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.types import Uuid
from app.database import Base


class ApiKey(Base):
    __tablename__ = "api_keys"

    id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    project_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("projects.id", ondelete="CASCADE"), nullable=False, index=True
    )
    created_by: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    service: Mapped[str] = mapped_column(String(255), nullable=False)
    encrypted_value: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(50), nullable=False, default="active")
    tags: Mapped[list | None] = mapped_column(JSON, nullable=True, default=list)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    rotation_reminder_days: Mapped[int] = mapped_column(Integer, nullable=False, default=30)
    last_rotated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    # Relationships
    project: Mapped["Project"] = relationship("Project", back_populates="api_keys")
    creator: Mapped["User"] = relationship("User", foreign_keys=[created_by])
    rotation_events: Mapped[list["RotationEvent"]] = relationship("RotationEvent", back_populates="api_key", cascade="all, delete-orphan")
