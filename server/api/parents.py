"""API route handlers for parent messages and communication log."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth import AuthenticatedUser, get_current_user
from server.database import get_db
from server.models.parent_message import ParentMessage
from server.schemas.parent_message import ParentMessageCreate, ParentMessageResponse

router = APIRouter(prefix="/parents", tags=["parents"])


@router.post("/messages", response_model=ParentMessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    body: ParentMessageCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ParentMessage:
    message = ParentMessage(
        lesson_id=body.lesson_id,
        student_id=body.student_id,
        teacher_id=user.id,
        message_body=body.message_body,
        message_type=body.message_type,
        channel=body.channel,
        recipient=body.recipient,
        sent_at=datetime.now(timezone.utc),
        delivery_status="sent",
    )
    db.add(message)
    await db.commit()
    await db.refresh(message)
    return message


@router.get(
    "/messages/{student_id}",
    response_model=list[ParentMessageResponse],
)
async def get_communication_log(
    student_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[ParentMessage]:
    result = await db.execute(
        select(ParentMessage)
        .where(
            ParentMessage.student_id == student_id,
            ParentMessage.teacher_id == user.id,
        )
        .order_by(ParentMessage.sent_at.desc())
    )
    return list(result.scalars().all())
