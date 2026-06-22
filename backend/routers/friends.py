"""Friendship endpoints — search users, send requests, accept, and list friends."""
from fastapi import APIRouter

from core.auth import CurrentUser
from core.responses import fail, ok
from core.supabase_client import get_supabase
from models.models import Tables
from schemas.schemas import FriendRequest

router = APIRouter(prefix="/friends", tags=["friends"])


def _relationships_for(sb, user_id: str) -> dict[str, str]:
    """Map other_user_id -> relationship as seen from `user_id`.

    Values: 'accepted', 'pending_sent' (we asked them),
    'pending_received' (they asked us).
    """
    rows = (
        sb.table(Tables.FRIENDSHIPS)
        .select("user_id,friend_id,status")
        .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}")
        .execute()
    )
    rel: dict[str, str] = {}
    for r in rows.data:
        other = r["friend_id"] if r["user_id"] == user_id else r["user_id"]
        if r["status"] == "accepted":
            rel[other] = "accepted"
        elif r["user_id"] == user_id:
            rel[other] = "pending_sent"
        else:
            rel[other] = "pending_received"
    return rel


@router.get("/search")
def search_users(q: str, user_id: str = CurrentUser):
    """Find users by username (case-insensitive, partial), annotated with the
    current relationship so the client can show 추가 / 요청됨 / 친구."""
    q = q.strip()
    if not q:
        return ok([])
    sb = get_supabase()
    users = (
        sb.table(Tables.USERS)
        .select("id,username,avatar_url")
        .ilike("username", f"%{q}%")
        .neq("id", user_id)
        .limit(20)
        .execute()
    )
    rel = _relationships_for(sb, user_id)
    out = [
        {
            "id": u["id"],
            "username": u["username"],
            "avatar_url": u.get("avatar_url"),
            "relationship": rel.get(u["id"], "none"),
        }
        for u in users.data
    ]
    return ok(out)


@router.get("")
def list_friends(user_id: str = CurrentUser):
    """List accepted friendships involving the current user."""
    sb = get_supabase()
    res = (
        sb.table(Tables.FRIENDSHIPS)
        .select("*")
        .eq("status", "accepted")
        .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}")
        .execute()
    )
    return ok(res.data)


@router.get("/requests")
def list_pending_requests(user_id: str = CurrentUser):
    """Incoming pending requests (with the requester's profile) for the current user."""
    sb = get_supabase()
    reqs = (
        sb.table(Tables.FRIENDSHIPS)
        .select("*")
        .eq("status", "pending")
        .eq("friend_id", user_id)
        .execute()
    )
    if not reqs.data:
        return ok([])

    requester_ids = [r["user_id"] for r in reqs.data]
    users = (
        sb.table(Tables.USERS)
        .select("id,username,avatar_url")
        .in_("id", requester_ids)
        .execute()
    )
    by_id = {u["id"]: u for u in users.data}
    out = [
        {
            "id": r["id"],  # friendship id (used to accept)
            "requester_id": r["user_id"],
            "username": by_id.get(r["user_id"], {}).get("username"),
            "avatar_url": by_id.get(r["user_id"], {}).get("avatar_url"),
            "created_at": r["created_at"],
        }
        for r in reqs.data
    ]
    return ok(out)


@router.post("/request")
def send_request(payload: FriendRequest, user_id: str = CurrentUser):
    """Send a friend request to another user (idempotent-ish; blocks duplicates)."""
    if payload.friend_id == user_id:
        return fail("You cannot add yourself")
    sb = get_supabase()

    # Block if any friendship already exists in either direction.
    existing = _relationships_for(sb, user_id).get(payload.friend_id)
    if existing == "accepted":
        return fail("Already friends")
    if existing in ("pending_sent", "pending_received"):
        return fail("A request is already pending")

    res = (
        sb.table(Tables.FRIENDSHIPS)
        .insert(
            {"user_id": user_id, "friend_id": payload.friend_id, "status": "pending"}
        )
        .execute()
    )
    return ok(res.data[0])


@router.post("/{friendship_id}/accept")
def accept_request(friendship_id: str, user_id: str = CurrentUser):
    """Accept a pending request addressed to the current user."""
    sb = get_supabase()
    res = (
        sb.table(Tables.FRIENDSHIPS)
        .update({"status": "accepted"})
        .eq("id", friendship_id)
        .eq("friend_id", user_id)  # only the recipient may accept
        .execute()
    )
    if not res.data:
        return fail("Request not found", status_code=404)
    return ok(res.data[0])
