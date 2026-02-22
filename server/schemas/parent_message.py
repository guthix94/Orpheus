"""Pydantic request/response schemas for parent messages."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class ParentMessageCreate(BaseModel):
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    message_body: str
    message_type: str = "lesson_summary"
    channel: str = "email"
    recipient: str


class ParentMessageResponse(BaseModel):
    id: uuid.UUID
    lesson_id: uuid.UUID
    student_id: uuid.UUID
    teacher_id: uuid.UUID
    message_body: str
    message_type: str
    channel: str
    recipient: str
    sent_at: datetime
    delivered_at: datetime | None = None
    delivery_status: str

    model_config = {"from_attributes": True}
