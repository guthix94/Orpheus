"""Teacher profile endpoints — display name and account info."""

import logging

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from server.auth import AuthenticatedUser, get_current_user
from server.config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/me", tags=["profile"])


class ProfileResponse(BaseModel):
    id: str
    email: str | None = None
    display_name: str | None = None


class DisplayNameUpdate(BaseModel):
    display_name: str


def _fetch_user_metadata(user: AuthenticatedUser) -> dict:
    """Fetch user_metadata from Supabase Auth admin API."""
    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user.id}"
    resp = httpx.get(
        url,
        headers={
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        },
        timeout=5,
    )
    if resp.status_code != 200:
        logger.warning("Failed to fetch user metadata: %s", resp.status_code)
        return {}
    return resp.json()


@router.get("", response_model=ProfileResponse)
async def get_profile(
    user: AuthenticatedUser = Depends(get_current_user),
) -> ProfileResponse:
    """Return the current teacher's profile info."""
    try:
        data = _fetch_user_metadata(user)
        meta = data.get("user_metadata") or {}
        display_name = (
            meta.get("display_name")
            or meta.get("full_name")
            or meta.get("name")
        )
    except Exception:
        logger.warning("Failed to fetch profile for %s", user.id, exc_info=True)
        display_name = None

    return ProfileResponse(
        id=str(user.id),
        email=user.email,
        display_name=display_name or user.email,
    )


@router.put("/display-name", response_model=ProfileResponse)
async def update_display_name(
    body: DisplayNameUpdate,
    user: AuthenticatedUser = Depends(get_current_user),
) -> ProfileResponse:
    """Update the teacher's display name in Supabase user_metadata."""
    display_name = body.display_name.strip()
    if not display_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Display name cannot be empty",
        )

    url = f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users/{user.id}"
    try:
        resp = httpx.put(
            url,
            headers={
                "apikey": settings.supabase_service_role_key,
                "Authorization": f"Bearer {settings.supabase_service_role_key}",
                "Content-Type": "application/json",
            },
            json={"user_metadata": {"display_name": display_name}},
            timeout=5,
        )
        if resp.status_code != 200:
            logger.error("Supabase user update failed: %s %s", resp.status_code, resp.text)
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to update display name",
            )
    except httpx.HTTPError as exc:
        logger.error("Supabase user update error: %s", exc, exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to update display name",
        )

    return ProfileResponse(
        id=str(user.id),
        email=user.email,
        display_name=display_name,
    )
