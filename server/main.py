# ffmpeg available via imageio-ffmpeg pip package (no OS-level install needed)
"""Orpheus API server entry point."""

import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.responses import Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    datefmt="%H:%M:%S",
)

from server.api.assignments import router as assignments_router
from server.api.lessons import router as lessons_router
from server.api.parents import router as parents_router
from server.api.students import router as students_router
from server.config import settings
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

_CORS_METHODS = "GET, POST, PUT, PATCH, DELETE, OPTIONS"
_CORS_HEADERS = "Content-Type, Authorization"


class DynamicCORSMiddleware(BaseHTTPMiddleware):
    """Reflect the request Origin back so credentialed requests work from any domain."""

    async def dispatch(self, request: Request, call_next):  # type: ignore[override]
        origin = request.headers.get("origin", "")

        # Preflight — return immediately with CORS headers
        if request.method == "OPTIONS":
            resp = Response(status_code=200)
            resp.headers["Access-Control-Allow-Origin"] = origin or "*"
            resp.headers["Access-Control-Allow-Credentials"] = "true"
            resp.headers["Access-Control-Allow-Methods"] = _CORS_METHODS
            resp.headers["Access-Control-Allow-Headers"] = _CORS_HEADERS
            resp.headers["Access-Control-Max-Age"] = "600"
            return resp

        response = await call_next(request)
        response.headers["Access-Control-Allow-Origin"] = origin or "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Allow-Methods"] = _CORS_METHODS
        response.headers["Access-Control-Allow-Headers"] = _CORS_HEADERS
        return response


app.add_middleware(DynamicCORSMiddleware)


app.include_router(students_router, prefix="/api")
app.include_router(lessons_router, prefix="/api")
app.include_router(parents_router, prefix="/api")
app.include_router(assignments_router, prefix="/api")


@app.get("/health")
async def health_check() -> dict[str, str]:
    return {"status": "ok"}
