"""API route handlers for assignment tracking and status updates."""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth import AuthenticatedUser, get_current_user
from server.database import get_db
from server.models.assignment import AssignmentRecord
from server.models.student import Student
from server.schemas.assignment import AssignmentResponse, AssignmentStatusUpdate

router = APIRouter(prefix="/assignments", tags=["assignments"])

VALID_STATUSES = {"assigned", "achieved", "partially_achieved", "not_attempted"}


@router.get("/{student_id}", response_model=list[AssignmentResponse])
async def list_assignments(
    student_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[AssignmentRecord]:
    # Verify student belongs to this teacher
    student_result = await db.execute(
        select(Student).where(Student.id == student_id, Student.teacher_id == user.id)
    )
    if student_result.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    result = await db.execute(
        select(AssignmentRecord)
        .where(AssignmentRecord.student_id == student_id)
        .order_by(AssignmentRecord.assigned_at.desc())
    )
    return list(result.scalars().all())


@router.patch("/{assignment_id}", response_model=AssignmentResponse)
async def update_assignment_status(
    assignment_id: uuid.UUID,
    body: AssignmentStatusUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AssignmentRecord:
    if body.status not in VALID_STATUSES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Invalid status. Must be one of: {', '.join(sorted(VALID_STATUSES))}",
        )

    # Join through student to verify teacher ownership
    result = await db.execute(
        select(AssignmentRecord)
        .join(Student, AssignmentRecord.student_id == Student.id)
        .where(AssignmentRecord.id == assignment_id, Student.teacher_id == user.id)
    )
    assignment = result.scalar_one_or_none()
    if assignment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Assignment not found",
        )

    assignment.status = body.status
    assignment.status_updated_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(assignment)
    return assignment
