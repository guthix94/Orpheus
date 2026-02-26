"""Pydantic request/response schemas for students."""

import uuid
from datetime import datetime

from pydantic import BaseModel


class StudentCreate(BaseModel):
    name: str
    instrument: str
    parent_email: str | None = None
    parent_phone: str | None = None
    notes: str | None = None


class StudentUpdate(BaseModel):
    name: str | None = None
    instrument: str | None = None
    parent_email: str | None = None
    parent_phone: str | None = None
    notes: str | None = None
    estimated_level: str | None = None
    current_pieces: list[str] | None = None


class StudentResponse(BaseModel):
    id: uuid.UUID
    teacher_id: uuid.UUID
    name: str
    instrument: str
    created_at: datetime
    current_pieces: list[str] | None = None
    estimated_level: str | None = None
    notes: str | None = None
    parent_email: str | None = None
    parent_phone: str | None = None
    parent_portal_token: uuid.UUID | None = None

    model_config = {"from_attributes": True}


class PortalTokenResponse(BaseModel):
    parent_portal_token: uuid.UUID

    model_config = {"from_attributes": True}
