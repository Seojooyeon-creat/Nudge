# Nudge 🚪

A mobile app where close friends can see each other's current status — like a
digital door sign — and send lightweight reactions. **No text chat. Just
presence and nudges.**

- Write your own status — **no presets.** Each user has **7 door-sign slots**
  (emoji + a ≤16-char label) and writes whatever they want on them.
- One slot is *active* at a time; with none active you show the fixed default
  **❓ 알 수 없음** to friends.
- Close friends see your active status **in real time** (Supabase Realtime).
- Send a light reaction: knock 🚪, coffee ☕, or eyes 👀

## Tech stack

| Layer            | Tech                                   |
| ---------------- | -------------------------------------- |
| Frontend         | React Native (Expo)                    |
| Backend          | FastAPI                                |
| Database & Auth  | Supabase (Postgres + Supabase Auth)    |
| Push (later)     | Expo Notifications — *placeholder only* |

All API responses follow a single envelope:

```json
{ "success": true, "data": { ... }, "error": null }
```

## Project structure

```
Nudge/
├── frontend/                 # Expo React Native app
│   ├── App.js                # Root: auth gate → Login or Home
│   ├── app.config.js         # Injects .env into Expo `extra`
│   └── src/
│       ├── lib/              # supabase client, time (X분 전), emoji helpers
│       ├── api/client.js     # fetch wrapper, unwraps the envelope
│       ├── context/AuthContext.js
│       ├── components/       # StatusPickerSheet, StatusEditorModal
│       └── screens/          # Login, Home
├── backend/                  # FastAPI app
│   ├── main.py               # App entry + routers + error envelope
│   ├── routers/              # auth, status, friends, reactions
│   ├── models/               # table-name constants
│   ├── schemas/              # Pydantic request/response models
│   └── core/                 # config, supabase client, auth, responses
├── supabase/
│   └── schema.sql            # Tables + Row Level Security policies
└── README.md
```

## Data model

| Table         | Columns                                                        |
| ------------- | ------------------------------------------------------------- |
| `users`        | id, username, avatar_url, created_at                          |
| `friendships`  | id, user_id, friend_id, status (`pending`/`accepted`), created_at |
| `status_slots` | id, user_id, slot_index (0–6), emoji, label (≤16), updated_at — a user's 7 private slots |
| `statuses`     | id, user_id, slot_index, emoji, label, updated_at — the **active** slot, visible to friends (Realtime) |
| `reactions`    | id, sender_id, receiver_id, type (`knock`/`coffee`/`eyes`), created_at |

Full DDL (with RLS policies) is in [`supabase/schema.sql`](supabase/schema.sql).

## Getting started

### 1. Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Open the **SQL editor** and run [`supabase/schema.sql`](supabase/schema.sql).
3. Enable **Google** sign-in — see [Authentication](#authentication-google-oauth-only) below.
4. Grab your keys from **Project Settings → API**:
   - Project URL
   - `anon` key (frontend)
   - `service_role` key + JWT secret (backend)

### 2. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # then fill in your Supabase values
uvicorn main:app --reload   # http://localhost:8000  (docs at /docs)
```

### 3. Frontend

```bash
cd frontend
npm install
cp .env.example .env        # then fill in your Supabase values + API URL
npx expo start              # scan the QR code with Expo Go
```

> On a physical device, set `EXPO_PUBLIC_API_URL` to your computer's LAN IP
> (e.g. `http://192.168.1.20:8000`), not `localhost`.

## API overview

| Method & path                     | Description                          |
| --------------------------------- | ------------------------------------ |
| `GET  /health`                    | Liveness check                       |
| `POST /auth/google`               | Verify Google session, auto-create profile on first login |
| `GET  /auth/me`                   | Current profile (auto-creates a stub) |
| `PATCH /auth/me`                  | Update username / avatar             |
| `GET  /status/me`                 | My 7 slots + which one is active     |
| `PUT  /status/slots/{index}`      | Create or edit a slot (0–6)          |
| `DELETE /status/slots/{index}`    | Delete a slot (reset to empty)       |
| `PUT  /status/active`             | Set active slot by index, or `null` to clear |
| `GET  /status/friends`            | All friends' active status (live via Realtime) |
| `GET  /friends`                   | List accepted friends                |
| `GET  /friends/requests`          | Incoming pending requests            |
| `POST /friends/request`           | Send a friend request                |
| `POST /friends/{id}/accept`       | Accept a request                     |
| `POST /reactions`                 | Send a nudge                         |
| `GET  /reactions/received`        | Nudges sent to you                   |

### Authentication (Google OAuth only)

Google is the **only** sign-in method — no email/password, no phone.

Flow:

1. The app calls `supabase.auth.signInWithOAuth({ provider: "google" })` and
   opens the consent screen in a secure browser tab (`expo-web-browser`).
2. Google redirects back to `com.nudgeapp://auth/callback`; the app exchanges
   the result for a Supabase session and stores it in **SecureStore**.
3. The app POSTs the session token to `/auth/google`, which verifies it with
   Supabase and **auto-creates the profile on first login** (username defaults
   to the Google display name).
4. All other requests send the JWT as `Authorization: Bearer <token>`; the
   backend verifies it with the project JWT secret (`backend/core/auth.py`).
   Token refresh is automatic (`autoRefreshToken` in `src/lib/supabase.js`).

**One-time provider setup:**

- **Google Cloud Console** → create an OAuth 2.0 client ID, note the client ID
  and secret.
- **Supabase Dashboard** → Authentication → Providers → **Google** → enable and
  paste the client ID / secret.
- **Supabase Dashboard** → Authentication → URL Configuration → add redirect URL
  `com.nudgeapp://auth/callback` (this scheme is set in
  `frontend/app.json` → `expo.scheme`).

> The OAuth deep-link redirect needs a custom scheme, so test on a **dev build**
> or a physical device via Expo Go using the registered `com.nudgeapp` scheme.

## Roadmap / not yet built

- **Push notifications** — Expo Notifications is intentionally *not* wired up
  yet. The send-reaction handler has a `TODO(push)` placeholder
  (`backend/routers/reactions.py`) where a push to the receiver would go.
- Friend search / invite flow (the UI currently lists existing friends only).

## Design notes

- **MVP first** — no navigation library, no ORM, no bottom-sheet library (the
  picker is a plain `Modal`). The backend talks to Supabase via PostgREST
  (`supabase-py`); table names are centralized in `backend/models/models.py`.
- **Status model** — slots are *positional* (index 0–6) and private
  (`status_slots`). Activating a slot copies it into the friend-visible
  `statuses` row (one per user); clearing deletes that row. `updated_at` is
  maintained by a DB trigger.
- **Realtime** — friends subscribe to the `statuses` table, so active-status
  changes appear without polling (`src/screens/HomeScreen.js`).
- **Validation** — emoji = one character, label ≤ 16, max 7 slots, all enforced
  on both client and server.
- **Security** — the `service_role` key lives only on the backend. RLS policies
  in `schema.sql` protect the data even if the client hits Supabase directly;
  `status_slots` is owner-only, `statuses` is readable by friends.
# Nudge
