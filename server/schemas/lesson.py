"""Pydantic request/response schemas for lessons."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel


class LessonStart(BaseModel):
    student_id: uuid.UUID
    summary_style: str = "standard"


class LessonStop(BaseModel):
    audio_file_path: str | None = None
    duration_seconds: int | None = None


class LessonUpdate(BaseModel):
    pieces_detected: list[str] | None = None
    teacher_summary: str | None = None
    parent_summary: str | None = None
    suggested_assignments: list[dict[str, Any]] | None = None


class AssignmentCreate(BaseModel):
    description: str
    details: str | None = None


class AssignmentUpdate(BaseModel):
    description: str | None = None
    details: str | None = None


class LessonResponse(BaseModel):
    id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    started_at: datetime
    ended_at: datetime | None = None
    duration_seconds: int | None = None
    audio_file_path: str | None = None
    status: str
    summary_style: str
    pieces_detected: list[str] | None = None
    teacher_summary: str | None = None
    teacher_summary_formal: str | None = None
    parent_summary: str | None = None
    suggested_assignments: list[dict[str, Any]] | None = None
    clips: list[dict[str, Any]] | None = None
    confirmed_at: datetime | None = None
    is_locked: bool = False

    # Internal pipeline data excluded from API response:
    # - processing_metadata (contains lesson_segments, music_refs, timing data)
    # - timeline_json (contains raw transcript segments)
    # These are stored on the Lesson model but never sent to the frontend.

    model_config = {"from_attributes": True}
