"""Musical piece metadata ORM model."""

import uuid

from sqlalchemy import Integer, String
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from sqlalchemy.orm import Mapped, mapped_column

from server.database import Base


class Piece(Base):
    __tablename__ = "pieces"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    composer: Mapped[str] = mapped_column(String(255), nullable=False)
    catalog_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    movement: Mapped[str | None] = mapped_column(String(100), nullable=True)
    instrument: Mapped[str] = mapped_column(String(100), nullable=False)
    difficulty_level: Mapped[str | None] = mapped_column(String(100), nullable=True)
    source: Mapped[str] = mapped_column(
        String(100), nullable=False
    )  # suzuki_book4, imslp, community, omr_scan
    score_file_path: Mapped[str] = mapped_column(String(500), nullable=False)
    chroma_cache_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    total_measures: Mapped[int] = mapped_column(Integer, nullable=False)
    estimated_duration_seconds: Mapped[int] = mapped_column(Integer, nullable=False)
    key_signature: Mapped[str | None] = mapped_column(String(20), nullable=True)
    time_signature: Mapped[str | None] = mapped_column(String(20), nullable=True)
    search_aliases: Mapped[list[str] | None] = mapped_column(ARRAY(String), nullable=True)
