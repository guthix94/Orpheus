"""Supabase Auth middleware — verifies teacher JWT tokens via JWKS."""

import logging
import threading
import time
import uuid
from dataclasses import dataclass

import httpx
import jwt
from jwt import PyJWK
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from server.config import settings

logger = logging.getLogger(__name__)

bearer_scheme = HTTPBearer(auto_error=not settings.dev_mode)

DEV_USER = uuid.UUID("00000000-0000-0000-0000-000000000000")

# ── JWKS cache ──────────────────────────────────────────────────────────

_JWKS_CACHE_TTL = 3600  # 1 hour

_jwks_lock = threading.Lock()
_jwks_keys: list[PyJWK] = []
_jwks_fetched_at: float = 0.0


def _jwks_url() -> str:
    base = settings.supabase_url.rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json"


def _refresh_jwks() -> list[PyJWK]:
    """Fetch JWKS from Supabase and parse into PyJWK objects."""
    global _jwks_keys, _jwks_fetched_at  # noqa: PLW0603

    url = _jwks_url()
    logger.info("Fetching JWKS from %s", url)
    resp = httpx.get(url, timeout=10)
    resp.raise_for_status()
    data = resp.json()

    keys = [PyJWK(k) for k in data["keys"]]
    logger.info("Loaded %d JWKS key(s)", len(keys))

    _jwks_keys = keys
    _jwks_fetched_at = time.monotonic()
    return keys


def _get_signing_keys() -> list[PyJWK]:
    """Return cached JWKS keys, refreshing if stale or empty."""
    now = time.monotonic()
    if _jwks_keys and (now - _jwks_fetched_at) < _JWKS_CACHE_TTL:
        return _jwks_keys

    with _jwks_lock:
        # Double-check after acquiring lock
        if _jwks_keys and (time.monotonic() - _jwks_fetched_at) < _JWKS_CACHE_TTL:
            return _jwks_keys
        return _refresh_jwks()


def _find_key_for_token(token: str) -> PyJWK:
    """Match the token's kid header to a JWKS key."""
    header = jwt.get_unverified_header(token)
    kid = header.get("kid")

    keys = _get_signing_keys()

    if kid:
        for k in keys:
            if k.key_id == kid:
                return k

    # kid not found — maybe keys rotated; force refresh once
    keys = _refresh_jwks()
    if kid:
        for k in keys:
            if k.key_id == kid:
                return k

    raise jwt.InvalidTokenError(f"No matching JWKS key for kid={kid!r}")


# ── Auth dependency ─────────────────────────────────────────────────────


@dataclass
class AuthenticatedUser:
    id: uuid.UUID
    email: str | None
    role: str | None


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> AuthenticatedUser:
    """Decode and verify a Supabase JWT, returning the authenticated user.

    When DEV_MODE=true, returns a stub user without requiring a token.
    """
    if settings.dev_mode:
        return AuthenticatedUser(
            id=DEV_USER,
            email="dev@orpheus.local",
            role="authenticated",
        )

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
        )

    token = credentials.credentials
    try:
        signing_key = _find_key_for_token(token)
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=["ES256", "HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError as exc:
        logger.warning("JWT verification failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
        )

    sub = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject claim",
        )

    return AuthenticatedUser(
        id=uuid.UUID(sub),
        email=payload.get("email"),
        role=payload.get("role"),
    )
