"""Pydantic request/response schemas for assignments."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class AssignmentStatusUpdate(BaseModel):
    status: str  # assigned, achieved, partially_achieved, not_attempted


class AssignmentResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    assigned_at: datetime
    description: str
    details: str | None = None
    status: str
    status_updated_at: datetime | None = None
    weeks_persisted: int

    model_config = {"from_attributes": True}
