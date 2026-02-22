"""Orpheus API server entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from server.api.assignments import router as assignments_router
from server.api.lessons import router as lessons_router
from server.api.parents import router as parents_router
from server.api.students import router as students_router
from server.database import engine


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Import models so they're registered with Base metadata
    import server.models  # noqa: F401

    yield
    await engine.dispose()


app = FastAPI(
    title="Orpheus",
    description="Intelligent lesson documentation system for music educators",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(students_router, prefix="/api")
app.include_router(lessons_router, prefix="/api")
app.include_router(parents_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
