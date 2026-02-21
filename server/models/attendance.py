"""Attendance and cancellation records ORM model."""

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from server.database import Base


class AttendanceRecord(Base):
    __tablename__ = "attendance_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    student_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("students.id"), nullable=False, index=True
    )
    term: Mapped[str] = mapped_column(String(50), nullable=False)  # "2026-spring"
    total_lessons: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    total_minutes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cancellations_student: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    cancellations_teacher: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    no_shows: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    attendance_rate: Mapped[float] = mapped_column(Float, nullable=False, default=0.0)
