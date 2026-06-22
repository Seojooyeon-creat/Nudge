"""Pydantic request/response schemas.

These describe the JSON payloads carried inside the `data` field of the
{ success, data, error } envelope.
"""
from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field, field_validator

# Each user has exactly this many status slots (indices 0..MAX_SLOTS-1).
MAX_SLOTS = 7
LABEL_MAX = 16

# Allowed door-sign skins (문패 디자인). Must stay in sync with the frontend
# (src/lib/themes.js). Stored on the user profile and shown to friends.
THEMES = {"wood", "metal", "hanji", "neon", "pub", "cafe", "plant", "moon"}
DEFAULT_THEME = "wood"


# ---- Auth ----
class GoogleAuthRequest(BaseModel):
    # The Supabase session access token obtained on the device after the
    # Google OAuth flow completes (supabase.auth.signInWithOAuth).
    access_token: str


# ---- Users ----
class UserOut(BaseModel):
    id: str
    username: str
    avatar_url: str | None = None
    theme: str = DEFAULT_THEME
    created_at: datetime


class UserUpdate(BaseModel):
    username: str | None = None
    avatar_url: str | None = None
    theme: str | None = None

    @field_validator("theme")
    @classmethod
    def _known_theme(cls, v: str | None) -> str | None:
        if v is not None and v not in THEMES:
            raise ValueError(f"theme must be one of {sorted(THEMES)}")
        return v


# ---- Friendships ----
class FriendStatus(str, Enum):
    pending = "pending"
    accepted = "accepted"


class FriendRequest(BaseModel):
    friend_id: str


class FriendshipOut(BaseModel):
    id: str
    user_id: str
    friend_id: str
    status: FriendStatus
    created_at: datetime


# ---- Status slots (the door sign) ----
# No presets: users write their own. Each user has MAX_SLOTS positional slots.
class SlotUpsert(BaseModel):
    emoji: str = Field(min_length=1)
    label: str = Field(min_length=1, max_length=LABEL_MAX)

    @field_validator("emoji")
    @classmethod
    def _single_emoji(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("emoji is required")
        # One user-perceived emoji. We allow ZWJ / skin-tone sequences (which span
        # several code points) but reject multi-character text. len() counts code
        # points, so 8 is a safe upper bound for a single compound emoji.
        if len(v) > 8 or " " in v:
            raise ValueError("emoji must be a single emoji")
        return v

    @field_validator("label")
    @classmethod
    def _trim_label(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("label is required")
        return v


class ActiveUpdate(BaseModel):
    # The slot to make active, or null to clear (blank door sign).
    slot_index: int | None = None

    @field_validator("slot_index")
    @classmethod
    def _in_range(cls, v: int | None) -> int | None:
        if v is not None and not (0 <= v < MAX_SLOTS):
            raise ValueError(f"slot_index must be between 0 and {MAX_SLOTS - 1}")
        return v


class SlotOut(BaseModel):
    slot_index: int
    emoji: str
    label: str
    updated_at: datetime


# ---- Reactions ----
class ReactionType(str, Enum):
    knock = "knock"
    coffee = "coffee"
    eyes = "eyes"


class ReactionCreate(BaseModel):
    receiver_id: str
    type: ReactionType


class ReactionOut(BaseModel):
    id: str
    sender_id: str
    receiver_id: str
    type: ReactionType
    created_at: datetime
