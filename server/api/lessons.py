"""API route handlers for lesson start/stop, summary, confirm/amend."""

import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth import AuthenticatedUser, get_current_user
from server.config import settings
from server.database import get_db
from server.models.lesson import Lesson
from server.schemas.lesson import LessonResponse, LessonStart, LessonStop

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/lessons", tags=["lessons"])


@router.post("", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def start_lesson(
    body: LessonStart,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    lesson = Lesson(
        student_id=body.student_id,
        teacher_id=user.id,
        started_at=datetime.now(timezone.utc),
        status="recording",
        summary_style=body.summary_style,
    )
    db.add(lesson)
    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/stop", response_model=LessonResponse)
async def stop_lesson(
    lesson_id: uuid.UUID,
    body: LessonStop,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    result = await db.execute(
        select(Lesson).where(
            Lesson.id == lesson_id,
            Lesson.teacher_id == user.id,
        )
    )
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if lesson.status != "recording":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lesson is '{lesson.status}', not recording",
        )

    now = datetime.now(timezone.utc)
    lesson.ended_at = now
    lesson.duration_seconds = int((now - lesson.started_at).total_seconds())
    lesson.audio_file_path = body.audio_file_path
    lesson.status = "processing"

    await db.commit()
    await db.refresh(lesson)

    # Kick off the processing pipeline in a background thread.
    # The pipeline opens its own synchronous DB session so it doesn't
    # interfere with the async request lifecycle.
    from processing.pipeline import run_pipeline

    logger.info("Scheduling processing pipeline for lesson %s", lesson.id)
    background_tasks.add_task(run_pipeline, lesson.id, settings.database_url)

    return lesson


@router.get("/{lesson_id}", response_model=LessonResponse)
async def get_lesson(
    lesson_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    result = await db.execute(
        select(Lesson).where(
            Lesson.id == lesson_id,
            Lesson.teacher_id == user.id,
        )
    )
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    return lesson


@router.get("", response_model=list[LessonResponse])
async def list_lessons(
    student_id: uuid.UUID | None = None,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Lesson]:
    query = select(Lesson).where(Lesson.teacher_id == user.id)
    if student_id is not None:
        query = query.where(Lesson.student_id == student_id)
    query = query.order_by(Lesson.started_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())
