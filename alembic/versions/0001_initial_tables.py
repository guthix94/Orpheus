"""initial tables

Revision ID: 0001
Revises:
Create Date: 2026-02-21
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0001"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    # Students
    op.create_table(
        "students",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("instrument", sa.String(100), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("current_pieces", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("estimated_level", sa.String(100), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("parent_email", sa.String(255), nullable=True),
        sa.Column("parent_phone", sa.String(50), nullable=True),
    )

    # Pieces (must come before lesson_segments which references it)
    op.create_table(
        "pieces",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("title", sa.String(255), nullable=False),
        sa.Column("composer", sa.String(255), nullable=False),
        sa.Column("catalog_number", sa.String(100), nullable=True),
        sa.Column("movement", sa.String(100), nullable=True),
        sa.Column("instrument", sa.String(100), nullable=False),
        sa.Column("difficulty_level", sa.String(100), nullable=True),
        sa.Column("source", sa.String(100), nullable=False),
        sa.Column("score_file_path", sa.String(500), nullable=False),
        sa.Column("chroma_cache_path", sa.String(500), nullable=True),
        sa.Column("total_measures", sa.Integer, nullable=False),
        sa.Column("estimated_duration_seconds", sa.Integer, nullable=False),
        sa.Column("key_signature", sa.String(20), nullable=True),
        sa.Column("time_signature", sa.String(20), nullable=True),
        sa.Column("search_aliases", postgresql.ARRAY(sa.String), nullable=True),
    )

    # Lessons
    op.create_table(
        "lessons",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("started_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("duration_seconds", sa.Integer, nullable=True),
        sa.Column("audio_file_path", sa.String(500), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="recording"),
        sa.Column("summary_style", sa.String(20), nullable=False, server_default="standard"),
        sa.Column("pieces_detected", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("timeline_json", postgresql.JSON, nullable=True),
        sa.Column("teacher_summary", sa.Text, nullable=True),
        sa.Column("teacher_summary_formal", sa.Text, nullable=True),
        sa.Column("parent_summary", sa.Text, nullable=True),
        sa.Column("suggested_assignments", postgresql.JSON, nullable=True),
        sa.Column("processing_metadata", postgresql.JSON, nullable=True),
        sa.Column("confirmed_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("is_locked", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("amendments", postgresql.JSON, nullable=True),
    )

    # Lesson segments
    op.create_table(
        "lesson_segments",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lessons.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("segment_type", sa.String(20), nullable=False),
        sa.Column("start_time", sa.Float, nullable=False),
        sa.Column("end_time", sa.Float, nullable=False),
        sa.Column("transcript", sa.Text, nullable=True),
        sa.Column("speaker", sa.String(20), nullable=True),
        sa.Column(
            "piece_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("pieces.id"),
            nullable=True,
        ),
        sa.Column("measures_start", sa.Integer, nullable=True),
        sa.Column("measures_end", sa.Integer, nullable=True),
        sa.Column("avg_tempo", sa.Float, nullable=True),
        sa.Column("alignment_confidence", sa.Float, nullable=True),
        sa.Column("repetition_number", sa.Integer, nullable=True),
        sa.Column("intonation_avg_cents", sa.Float, nullable=True),
    )

    # Parent messages
    op.create_table(
        "parent_messages",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lessons.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("teacher_id", postgresql.UUID(as_uuid=True), nullable=False, index=True),
        sa.Column("message_body", sa.Text, nullable=False),
        sa.Column("message_type", sa.String(50), nullable=False),
        sa.Column("channel", sa.String(20), nullable=False),
        sa.Column("recipient", sa.String(255), nullable=False),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("delivered_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("delivery_status", sa.String(20), nullable=False, server_default="sent"),
    )

    # Assignment records
    op.create_table(
        "assignment_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "lesson_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("lessons.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("description", sa.String(500), nullable=False),
        sa.Column("details", sa.Text, nullable=True),
        sa.Column("status", sa.String(30), nullable=False, server_default="assigned"),
        sa.Column("status_updated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("weeks_persisted", sa.Integer, nullable=False, server_default="0"),
    )

    # Attendance records
    op.create_table(
        "attendance_records",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "student_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("students.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("term", sa.String(50), nullable=False),
        sa.Column("total_lessons", sa.Integer, nullable=False, server_default="0"),
        sa.Column("total_minutes", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cancellations_student", sa.Integer, nullable=False, server_default="0"),
        sa.Column("cancellations_teacher", sa.Integer, nullable=False, server_default="0"),
        sa.Column("no_shows", sa.Integer, nullable=False, server_default="0"),
        sa.Column("attendance_rate", sa.Float, nullable=False, server_default="0.0"),
    )


def downgrade() -> None:
    op.drop_table("attendance_records")
    op.drop_table("assignment_records")
    op.drop_table("parent_messages")
    op.drop_table("lesson_segments")
    op.drop_table("lessons")
    op.drop_table("pieces")
    op.drop_table("students")
