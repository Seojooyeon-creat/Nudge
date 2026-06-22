"""Table name constants and column references.

Nudge talks to Supabase through the supabase-py client (PostgREST), so there is
no ORM layer. These constants keep table names in one place and avoid typos in
the routers. The authoritative schema lives in `supabase/schema.sql`.
"""


class Tables:
    USERS = "users"
    FRIENDSHIPS = "friendships"
    STATUS_SLOTS = "status_slots"  # a user's 7 editable slots (private)
    STATUSES = "statuses"          # the one active slot, visible to friends
    REACTIONS = "reactions"
