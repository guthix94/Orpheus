"""SQLAlchemy async engine and session management."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from server.config import settings

engine = create_async_engine(
    settings.database_url,
    echo=False,
    # Disable prepared statement caching — required for Supabase's
    # pgbouncer connection pooler in transaction mode.
    connect_args={"statement_cache_size": 0},
)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session() as session:
        yield session
