"""Public parent portal endpoints — NO authentication required."""

import logging
import uuid

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.config import settings
from server.database import get_db
from server.models.lesson import Lesson
from server.models.student import Student
from server.schemas.parent_portal import ParentLessonResponse, ParentPortalInfo

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/parent", tags=["parent-portal"])


def _fetch_teacher_name(teacher_id: uuid.UUID) -> str | None:
    """Look up teacher display name from Supabase Auth admin API."""
    try:
        url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{teacher_id}"
        resp = httpx.get(
            url,
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
            },
            timeout=5,
        )
        if resp.status_code != 200:
            return None
        data = resp.json()
        # Try user_metadata.full_name, then email as fallback
        meta = data.get("user_metadata") or {}
        return meta.get("full_name") or meta.get("name") or data.get("email")
    except Exception:
        logger.warning("Failed to fetch teacher name for %s", teacher_id, exc_info=True)
        return None


@router.get("/{token}", response_model=ParentPortalInfo)
async def get_portal_info(
    token: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ParentPortalInfo:
    result = await db.execute(
        select(Student).where(Student.parent_portal_token == token)
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    teacher_name = _fetch_teacher_name(student.teacher_id)

    return ParentPortalInfo(
        student_name=student.name,
        teacher_name=teacher_name,
        instrument=student.instrument,
    )


@router.get("/{token}/lessons", response_model=list[ParentLessonResponse])
async def get_portal_lessons(
    token: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> list[ParentLessonResponse]:
    result = await db.execute(
        select(Student).where(Student.parent_portal_token == token)
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

    result = await db.execute(
        select(Lesson)
        .where(
            Lesson.student_id == student.id,
            Lesson.status == "completed",
        )
        .order_by(Lesson.started_at.desc())
    )
    lessons = result.scalars().all()

    return [
        ParentLessonResponse(
            parent_summary=lesson.parent_summary,
            suggested_assignments=lesson.suggested_assignments,
            pieces_detected=lesson.pieces_detected,
            clips=lesson.clips,
            started_at=lesson.started_at,
            duration_seconds=lesson.duration_seconds,
        )
        for lesson in lessons
    ]
