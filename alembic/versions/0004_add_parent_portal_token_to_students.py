"""add parent_portal_token to students

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-26
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0004"
down_revision: str | None = "0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("students")]
    if "parent_portal_token" not in columns:
        op.add_column(
            "students",
            sa.Column("parent_portal_token", postgresql.UUID(as_uuid=True), nullable=True),
        )
        op.create_index(
            "ix_students_parent_portal_token",
            "students",
            ["parent_portal_token"],
            unique=True,
        )


def downgrade() -> None:
    op.drop_index("ix_students_parent_portal_token", table_name="students")
    op.drop_column("students", "parent_portal_token")
