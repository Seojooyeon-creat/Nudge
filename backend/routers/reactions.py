"""Reaction endpoints — lightweight nudges (knock 🚪, coffee ☕, eyes 👀)."""
from fastapi import APIRouter

from core.auth import CurrentUser
from core.responses import fail, ok
from core.supabase_client import get_supabase
from models.models import Tables
from schemas.schemas import ReactionCreate

router = APIRouter(prefix="/reactions", tags=["reactions"])


@router.post("")
def send_reaction(payload: ReactionCreate, user_id: str = CurrentUser):
    """Send a nudge to a friend."""
    if payload.receiver_id == user_id:
        return fail("You cannot nudge yourself")

    sb = get_supabase()

    # Only allow nudging accepted friends.
    friendship = (
        sb.table(Tables.FRIENDSHIPS)
        .select("id")
        .eq("status", "accepted")
        .or_(
            f"and(user_id.eq.{user_id},friend_id.eq.{payload.receiver_id}),"
            f"and(user_id.eq.{payload.receiver_id},friend_id.eq.{user_id})"
        )
        .execute()
    )
    if not friendship.data:
        return fail("Not friends with this user", status_code=403)

    res = (
        sb.table(Tables.REACTIONS)
        .insert(
            {
                "sender_id": user_id,
                "receiver_id": payload.receiver_id,
                "type": payload.type.value,
            }
        )
        .execute()
    )

    # TODO(push): trigger an Expo push notification to receiver_id here.
    # Left as a placeholder for the MVP — see backend/README notes.

    return ok(res.data[0])


@router.get("/received")
def list_received(user_id: str = CurrentUser):
    """Reactions sent to the current user, newest first."""
    sb = get_supabase()
    res = (
        sb.table(Tables.REACTIONS)
        .select("*")
        .eq("receiver_id", user_id)
        .order("created_at", desc=True)
        .limit(50)
        .execute()
    )
    return ok(res.data)
