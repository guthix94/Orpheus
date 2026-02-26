"""API route handlers for lesson start/stop, summary, confirm/amend."""

import logging
import uuid
from datetime import datetime, timezone

from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm.attributes import flag_modified

from server.auth import AuthenticatedUser, get_current_user
from server.config import settings
from server.database import get_db
from server.models.lesson import Lesson
from server.schemas.lesson import (
    AssignmentCreate,
    AssignmentUpdate,
    LessonResponse,
    LessonStart,
    LessonStop,
    LessonUpdate,
)

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
    lesson.status = "processing"

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.post("/{lesson_id}/upload-audio", response_model=LessonResponse)
async def upload_audio(
    lesson_id: uuid.UUID,
    file: UploadFile,
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
    if lesson.status != "processing":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Lesson is '{lesson.status}', expected 'processing'",
        )

    # Save the uploaded audio to local storage
    storage_dir = Path(settings.audio_storage_path)
    storage_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename).suffix if file.filename else ".webm"
    file_path = storage_dir / f"{lesson_id}{suffix}"

    content = await file.read()
    file_path.write_bytes(content)
    logger.info("Saved %d bytes of audio to %s", len(content), file_path)

    lesson.audio_file_path = str(file_path)
    await db.commit()
    await db.refresh(lesson)

    # Now that the audio file is on disk, kick off the processing pipeline.
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
    lesson_status: str | None = None,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Lesson]:
    query = select(Lesson).where(Lesson.teacher_id == user.id)
    if student_id is not None:
        query = query.where(Lesson.student_id == student_id)
    if lesson_status is not None:
        query = query.where(Lesson.status == lesson_status)
    query = query.order_by(Lesson.started_at.desc())
    result = await db.execute(query)
    return list(result.scalars().all())


# ── Lesson partial update ──


@router.patch("/{lesson_id}", response_model=LessonResponse)
async def update_lesson(
    lesson_id: uuid.UUID,
    body: LessonUpdate,
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

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(lesson, field, value)

    await db.commit()
    await db.refresh(lesson)
    return lesson


# ── Lesson assignment CRUD (operates on suggested_assignments JSON column) ──


@router.post("/{lesson_id}/assignments", response_model=LessonResponse, status_code=status.HTTP_201_CREATED)
async def create_lesson_assignment(
    lesson_id: uuid.UUID,
    body: AssignmentCreate,
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

    assignments = list(lesson.suggested_assignments or [])
    new_assignment = {
        "id": str(uuid.uuid4()),
        "description": body.description,
        "details": body.details,
    }
    assignments.append(new_assignment)
    lesson.suggested_assignments = assignments

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.patch("/{lesson_id}/assignments/{assignment_id}", response_model=LessonResponse)
async def update_lesson_assignment(
    lesson_id: uuid.UUID,
    assignment_id: str,
    body: AssignmentUpdate,
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

    assignments = list(lesson.suggested_assignments or [])
    found = False
    for a in assignments:
        if a.get("id") == assignment_id:
            update_data = body.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                a[field] = value
            found = True
            break

    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    lesson.suggested_assignments = assignments

    await db.commit()
    await db.refresh(lesson)
    return lesson


@router.delete("/{lesson_id}/assignments/{assignment_id}", response_model=LessonResponse)
async def delete_lesson_assignment(
    lesson_id: uuid.UUID,
    assignment_id: str,
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

    assignments = list(lesson.suggested_assignments or [])
    original_len = len(assignments)
    assignments = [a for a in assignments if a.get("id") != assignment_id]

    if len(assignments) == original_len:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    lesson.suggested_assignments = assignments

    await db.commit()
    await db.refresh(lesson)
    return lesson


# ── Clip sharing toggle ──


@router.patch("/{lesson_id}/clips/{clip_index}/share", response_model=LessonResponse)
async def toggle_clip_share(
    lesson_id: uuid.UUID,
    clip_index: int,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    """Toggle the shared_with_parent flag on a specific clip."""
    result = await db.execute(
        select(Lesson).where(
            Lesson.id == lesson_id,
            Lesson.teacher_id == user.id,
        )
    )
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")

    clips = list(lesson.clips or [])
    if clip_index < 0 or clip_index >= len(clips):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Clip not found")

    clips[clip_index]["shared_with_parent"] = not clips[clip_index].get("shared_with_parent", False)
    lesson.clips = clips
    flag_modified(lesson, "clips")

    await db.commit()
    await db.refresh(lesson)
    return lesson


# ── Orphaned lesson recovery ──


@router.post("/{lesson_id}/cancel", response_model=LessonResponse)
async def cancel_lesson(
    lesson_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    """Cancel/discard an orphaned lesson stuck in 'recording' status."""
    result = await db.execute(
        select(Lesson).where(
            Lesson.id == lesson_id,
            Lesson.teacher_id == user.id,
        )
    )
    lesson = result.scalar_one_or_none()
    if lesson is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lesson not found")
    if lesson.status not in ("recording", "failed"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Cannot cancel lesson with status '{lesson.status}'",
        )

    now = datetime.now(timezone.utc)
    lesson.status = "cancelled"
    lesson.ended_at = lesson.ended_at or now
    lesson.duration_seconds = lesson.duration_seconds or int(
        (now - lesson.started_at).total_seconds()
    )

    await db.commit()
    await db.refresh(lesson)
    logger.info("Lesson %s cancelled (was orphaned in 'recording' status)", lesson.id)
    return lesson


@router.post("/{lesson_id}/recover", response_model=LessonResponse)
async def recover_lesson(
    lesson_id: uuid.UUID,
    background_tasks: BackgroundTasks,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Lesson:
    """Attempt to recover an orphaned lesson — process whatever audio exists."""
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
            detail=f"Cannot recover lesson with status '{lesson.status}'",
        )

    now = datetime.now(timezone.utc)
    lesson.ended_at = now
    lesson.duration_seconds = int((now - lesson.started_at).total_seconds())

    # Check if audio file exists on disk
    if lesson.audio_file_path and Path(lesson.audio_file_path).exists():
        lesson.status = "processing"
        await db.commit()
        await db.refresh(lesson)

        from processing.pipeline import run_pipeline

        logger.info("Recovering lesson %s — audio found, starting pipeline", lesson.id)
        background_tasks.add_task(run_pipeline, lesson.id, settings.database_url)
    else:
        # No audio file — mark as failed
        lesson.status = "failed"
        lesson.processing_metadata = {
            "error": "No audio file found — recording was lost when the browser tab was closed.",
            "recovered_at": now.isoformat(),
        }
        await db.commit()
        await db.refresh(lesson)
        logger.info("Lesson %s recovery failed — no audio file on disk", lesson.id)

    return lesson
