"""Status endpoints — the digital door sign.

Model: each user has exactly MAX_SLOTS positional slots (`status_slots`), which
they write themselves (no presets). At most one slot is "active" at a time; the
active slot is mirrored into the friend-visible `statuses` table (one row per
user) so friends can read it — and subscribe to it via Supabase Realtime.

The slot's public identifier is its position (0..MAX_SLOTS-1).
"""
from fastapi import APIRouter

from core.auth import CurrentUser
from core.responses import fail, ok
from core.supabase_client import get_supabase
from models.models import Tables
from schemas.schemas import MAX_SLOTS, ActiveUpdate, SlotUpsert

router = APIRouter(prefix="/status", tags=["status"])


def _slot_payload(row: dict) -> dict:
    return {
        "slot_index": row["slot_index"],
        "emoji": row["emoji"],
        "label": row["label"],
        "updated_at": row["updated_at"],
    }


def _active_index(sb, user_id: str) -> int | None:
    res = sb.table(Tables.STATUSES).select("slot_index").eq("user_id", user_id).execute()
    return res.data[0]["slot_index"] if res.data else None


@router.get("/me")
def get_my_status(user_id: str = CurrentUser):
    """Return my MAX_SLOTS slots (null where empty) + which one is active."""
    sb = get_supabase()
    rows = (
        sb.table(Tables.STATUS_SLOTS)
        .select("*")
        .eq("user_id", user_id)
        .execute()
    )
    by_index = {row["slot_index"]: _slot_payload(row) for row in rows.data}
    slots = [by_index.get(i) for i in range(MAX_SLOTS)]
    return ok({"slots": slots, "active_slot_index": _active_index(sb, user_id)})


@router.put("/slots/{slot_index}")
def upsert_slot(slot_index: int, payload: SlotUpsert, user_id: str = CurrentUser):
    """Create or edit the slot at `slot_index`."""
    if not 0 <= slot_index < MAX_SLOTS:
        return fail(f"slot_index must be between 0 and {MAX_SLOTS - 1}")

    sb = get_supabase()
    row = {
        "user_id": user_id,
        "slot_index": slot_index,
        "emoji": payload.emoji,
        "label": payload.label,
    }
    # updated_at is maintained by a DB trigger (see supabase/schema.sql).
    res = sb.table(Tables.STATUS_SLOTS).upsert(row, on_conflict="user_id,slot_index").execute()

    # If this slot is currently active, keep the public door sign in sync.
    if _active_index(sb, user_id) == slot_index:
        sb.table(Tables.STATUSES).update(
            {"emoji": payload.emoji, "label": payload.label}
        ).eq("user_id", user_id).execute()

    return ok(_slot_payload(res.data[0]))


@router.delete("/slots/{slot_index}")
def delete_slot(slot_index: int, user_id: str = CurrentUser):
    """Delete the slot at `slot_index` (resets it to empty)."""
    if not 0 <= slot_index < MAX_SLOTS:
        return fail(f"slot_index must be between 0 and {MAX_SLOTS - 1}")

    sb = get_supabase()
    sb.table(Tables.STATUS_SLOTS).delete().eq("user_id", user_id).eq(
        "slot_index", slot_index
    ).execute()

    # If the deleted slot was active, clear the door sign too.
    if _active_index(sb, user_id) == slot_index:
        sb.table(Tables.STATUSES).delete().eq("user_id", user_id).execute()

    return ok({"slot_index": slot_index, "deleted": True})


@router.put("/active")
def set_active(payload: ActiveUpdate, user_id: str = CurrentUser):
    """Set the active slot by index, or clear it (null = blank door sign)."""
    sb = get_supabase()

    if payload.slot_index is None:
        sb.table(Tables.STATUSES).delete().eq("user_id", user_id).execute()
        return ok({"active_slot_index": None})

    slot = (
        sb.table(Tables.STATUS_SLOTS)
        .select("*")
        .eq("user_id", user_id)
        .eq("slot_index", payload.slot_index)
        .execute()
    )
    if not slot.data:
        return fail("That slot is empty", status_code=404)

    s = slot.data[0]
    sb.table(Tables.STATUSES).upsert(
        {
            "user_id": user_id,
            "slot_index": s["slot_index"],
            "emoji": s["emoji"],
            "label": s["label"],
        },
        on_conflict="user_id",
    ).execute()
    return ok({"active_slot_index": s["slot_index"]})


@router.get("/friends")
def friends_status(user_id: str = CurrentUser):
    """All accepted friends with their active status.

    `status` is null when a friend has nothing active; the client renders that as
    the fixed default (❓ 알 수 없음).
    """
    sb = get_supabase()
    friendships = (
        sb.table(Tables.FRIENDSHIPS)
        .select("user_id,friend_id")
        .eq("status", "accepted")
        .or_(f"user_id.eq.{user_id},friend_id.eq.{user_id}")
        .execute()
    )
    friend_ids = [
        f["friend_id"] if f["user_id"] == user_id else f["user_id"]
        for f in friendships.data
    ]
    if not friend_ids:
        return ok([])

    users = (
        sb.table(Tables.USERS)
        .select("id,username,avatar_url,theme")
        .in_("id", friend_ids)
        .execute()
    )
    statuses = (
        sb.table(Tables.STATUSES)
        .select("user_id,emoji,label,updated_at")
        .in_("user_id", friend_ids)
        .execute()
    )
    status_by_user = {s["user_id"]: s for s in statuses.data}

    out = []
    for u in users.data:
        s = status_by_user.get(u["id"])
        out.append(
            {
                "user_id": u["id"],
                "username": u["username"],
                "avatar_url": u.get("avatar_url"),
                "theme": u.get("theme") or "wood",
                "status": (
                    {"emoji": s["emoji"], "label": s["label"], "updated_at": s["updated_at"]}
                    if s
                    else None
                ),
            }
        )
    return ok(out)
