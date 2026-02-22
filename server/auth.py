"""Supabase Auth middleware — verifies teacher JWT tokens."""

import uuid
from dataclasses import dataclass

import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from server.config import settings

bearer_scheme = HTTPBearer(auto_error=not settings.dev_mode)

DEV_USER = uuid.UUID("00000000-0000-0000-0000-000000000000")


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
        payload = jwt.decode(
            token,
            settings.supabase_jwt_secret,
            algorithms=["HS256"],
            audience="authenticated",
        )
    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
        )
    except jwt.InvalidTokenError:
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
