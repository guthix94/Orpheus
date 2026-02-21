"""Individual segment within a lesson ORM model."""

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from server.database import Base


class LessonSegment(Base):
    __tablename__ = "lesson_segments"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    lesson_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("lessons.id"), nullable=False, index=True
    )
    segment_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # speech, music, silence
    start_time: Mapped[float] = mapped_column(Float, nullable=False)
    end_time: Mapped[float] = mapped_column(Float, nullable=False)

    # Speech segments
    transcript: Mapped[str | None] = mapped_column(Text, nullable=True)
    speaker: Mapped[str | None] = mapped_column(String(20), nullable=True)  # teacher, student

    # Music segments
    piece_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("pieces.id"), nullable=True
    )
    measures_start: Mapped[int | None] = mapped_column(Integer, nullable=True)
    measures_end: Mapped[int | None] = mapped_column(Integer, nullable=True)
    avg_tempo: Mapped[float | None] = mapped_column(Float, nullable=True)
    alignment_confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    repetition_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    intonation_avg_cents: Mapped[float | None] = mapped_column(Float, nullable=True)
