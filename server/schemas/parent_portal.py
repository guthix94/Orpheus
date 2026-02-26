"""Pydantic response schemas for the public parent portal."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel


class ParentPortalInfo(BaseModel):
    student_name: str
    teacher_name: str | None = None
    instrument: str


class ParentLessonResponse(BaseModel):
    parent_summary: str | None = None
    suggested_assignments: list[dict[str, Any]] | None = None
    pieces_detected: list[str] | None = None
    clips: list[dict[str, Any]] | None = None
    started_at: datetime
    duration_seconds: int | None = None
