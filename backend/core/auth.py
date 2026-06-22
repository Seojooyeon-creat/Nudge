"""Dependency that verifies a Supabase Auth JWT and returns the current user id.

The frontend obtains a JWT from Supabase Auth (Google OAuth) and sends it as
`Authorization: Bearer <token>`. We verify it by asking Supabase to resolve the
token to a user (`auth.get_user`). This works regardless of the project's JWT
signing scheme — modern Supabase projects sign tokens with asymmetric keys
(ES256), so verifying locally with the legacy HS256 shared secret fails.
"""
from fastapi import Depends, Header, HTTPException, status

from core.supabase_client import get_supabase


def get_current_user_id(authorization: str = Header(default="")) -> str:
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token",
        )
    token = authorization.split(" ", 1)[1]
    try:
        result = get_supabase().auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    user = getattr(result, "user", None)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    return user.id


CurrentUser = Depends(get_current_user_id)
