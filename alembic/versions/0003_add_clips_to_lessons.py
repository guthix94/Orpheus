"""add clips to lessons

Revision ID: 0003
Revises: 0002
Create Date: 2026-02-24
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy import inspect
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = inspect(conn)
    columns = [c["name"] for c in inspector.get_columns("lessons")]
    if "clips" not in columns:
        op.add_column("lessons", sa.Column("clips", postgresql.JSON, nullable=True))


def downgrade() -> None:
    op.drop_column("lessons", "clips")
