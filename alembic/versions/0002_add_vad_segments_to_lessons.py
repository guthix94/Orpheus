"""add vad_segments to lessons

Revision ID: 0002
Revises: 0001
Create Date: 2026-02-23
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("lessons")]
    if "vad_segments" not in columns:
        op.add_column("lessons", sa.Column("vad_segments", postgresql.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("lessons", "vad_segments")
