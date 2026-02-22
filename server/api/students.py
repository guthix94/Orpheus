"""API route handlers for student CRUD."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from server.auth import AuthenticatedUser, get_current_user
from server.database import get_db
from server.models.student import Student
from server.schemas.student import StudentCreate, StudentResponse, StudentUpdate

router = APIRouter(prefix="/students", tags=["students"])


@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    body: StudentCreate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Student:
    student = Student(
        teacher_id=user.id,
        name=body.name,
        instrument=body.instrument,
        parent_email=body.parent_email,
        parent_phone=body.parent_phone,
        notes=body.notes,
    )
    db.add(student)
    await db.commit()
    await db.refresh(student)
    return student


@router.get("", response_model=list[StudentResponse])
async def list_students(
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> list[Student]:
    result = await db.execute(
        select(Student)
        .where(Student.teacher_id == user.id)
        .order_by(Student.name)
    )
    return list(result.scalars().all())


@router.get("/{student_id}", response_model=StudentResponse)
async def get_student(
    student_id: uuid.UUID,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Student:
    result = await db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.teacher_id == user.id,
        )
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: uuid.UUID,
    body: StudentUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Student:
    result = await db.execute(
        select(Student).where(
            Student.id == student_id,
            Student.teacher_id == user.id,
        )
    )
    student = result.scalar_one_or_none()
    if student is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Student not found")

    for field, value in body.model_dump(exclude_unset=True).items():
        setattr(student, field, value)

    await db.commit()
    await db.refresh(student)
    return student
