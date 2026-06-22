"""Authentication endpoints (Google OAuth via Supabase Auth).

Sign-in itself happens on the device: the Expo app runs the Google OAuth flow
through `supabase.auth.signInWithOAuth` and ends up with a Supabase session.
The backend's job is to (a) verify that session and bootstrap the user's public
profile, and (b) expose the current profile to authenticated requests.

Supabase Dashboard setup (one-time):
  - Auth -> Providers -> Google -> enable
  - Paste the Google OAuth client ID / secret (from Google Cloud Console)
  - Auth -> URL Configuration -> add redirect URL: com.nudgeapp://auth/callback
"""
from fastapi import APIRouter

from core.auth import CurrentUser
from core.responses import fail, ok
from core.supabase_client import get_supabase
from models.models import Tables
from schemas.schemas import GoogleAuthRequest, UserUpdate

router = APIRouter(prefix="/auth", tags=["auth"])


def _ensure_profile(sb, user_id: str, username: str, avatar_url: str | None = None):
    """Return the user's profile row, creating it on first login.

    Idempotent: if a profile already exists it is returned unchanged.
    """
    existing = sb.table(Tables.USERS).select("*").eq("id", user_id).execute()
    if existing.data:
        return existing.data[0]

    row = {"id": user_id, "username": username}
    if avatar_url:
        row["avatar_url"] = avatar_url
    created = sb.table(Tables.USERS).insert(row).execute()
    return created.data[0]


@router.post("/google")
def google_login(payload: GoogleAuthRequest):
    """Verify a Supabase session and auto-create the profile on first login.

    The frontend sends the Supabase access token it received after the Google
    OAuth flow. We hand it to Supabase to confirm it's valid and to read the
    Google identity (display name, avatar), then bootstrap the public profile.
    """
    sb = get_supabase()
    try:
        result = sb.auth.get_user(payload.access_token)
    except Exception:
        return fail("Invalid Supabase session", status_code=401)

    user = getattr(result, "user", None)
    if user is None:
        return fail("Invalid Supabase session", status_code=401)

    meta = user.user_metadata or {}
    # Google populates full_name / name; fall back to a stub if absent.
    username = meta.get("full_name") or meta.get("name") or f"user_{user.id[:8]}"
    avatar_url = meta.get("avatar_url") or meta.get("picture")

    profile = _ensure_profile(sb, user.id, username, avatar_url)
    return ok(profile)


@router.get("/me")
def get_me(user_id: str = CurrentUser):
    """Return the authenticated user's profile, creating a stub row if needed."""
    sb = get_supabase()
    profile = _ensure_profile(sb, user_id, username=f"user_{user_id[:8]}")
    return ok(profile)


@router.patch("/me")
def update_me(payload: UserUpdate, user_id: str = CurrentUser):
    """Update the current user's username / avatar."""
    changes = payload.model_dump(exclude_none=True)
    if not changes:
        return fail("No fields to update")
    sb = get_supabase()
    res = sb.table(Tables.USERS).update(changes).eq("id", user_id).execute()
    if not res.data:
        return fail("User not found", status_code=404)
    return ok(res.data[0])
