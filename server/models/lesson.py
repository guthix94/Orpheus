"""Lesson record ORM model with immutability support."""

import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column

from server.database import Base


class Lesson(Base):
    __tablename__ = "lessons"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    teacher_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False, index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    audio_file_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, default="recording"
    )  # recording, processing, completed, failed
    summary_style: Mapped[str] = mapped_column(
        String(20), nullable=False, default="standard"
    )  # standard, formal

    # Populated after processing
    pieces_detected: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
    timeline_json: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    teacher_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    teacher_summary_formal: Mapped[str | None] = mapped_column(Text, nullable=True)
    parent_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    suggested_assignments: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
    processing_metadata: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Immutability
    confirmed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    is_locked: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    amendments: Mapped[list[dict] | None] = mapped_column(JSON, nullable=True)
