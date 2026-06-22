-- Nudge database schema
-- Run in the Supabase SQL editor (or `supabase db push`).
-- Auth users live in Supabase's built-in `auth.users`; the `users` table below
-- holds the public profile and is keyed to the same id.

-- ---------------------------------------------------------------------------
-- users (public profile)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
    id          uuid primary key references auth.users (id) on delete cascade,
    username    text not null,
    avatar_url  text,
    theme       text not null default 'wood',  -- door-sign skin (문패 디자인)
    created_at  timestamptz not null default now()
);
-- For DBs created before the door-sign theme feature.
alter table public.users add column if not exists theme text not null default 'wood';

-- ---------------------------------------------------------------------------
-- friendships
-- status: 'pending' | 'accepted'
-- user_id = requester, friend_id = recipient
-- ---------------------------------------------------------------------------
create table if not exists public.friendships (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users (id) on delete cascade,
    friend_id   uuid not null references public.users (id) on delete cascade,
    status      text not null default 'pending' check (status in ('pending', 'accepted')),
    created_at  timestamptz not null default now(),
    constraint friendships_not_self check (user_id <> friend_id),
    constraint friendships_unique_pair unique (user_id, friend_id)
);

-- ---------------------------------------------------------------------------
-- status_slots (the door sign): each user writes their own slots, no presets.
-- Exactly 7 positional slots per user (slot_index 0..6). Private to the owner.
-- ---------------------------------------------------------------------------
create table if not exists public.status_slots (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null references public.users (id) on delete cascade,
    slot_index  int not null check (slot_index >= 0 and slot_index <= 6),
    emoji       text not null,
    label       text not null check (char_length(label) <= 16),
    updated_at  timestamptz not null default now(),
    constraint status_slots_unique_slot unique (user_id, slot_index)
);

-- ---------------------------------------------------------------------------
-- statuses (one ACTIVE status per user — the slot currently shown to friends).
-- Denormalized copy of the active slot so friends can read / subscribe to it.
-- A missing row means a blank door sign (no active status).
-- ---------------------------------------------------------------------------
create table if not exists public.statuses (
    id          uuid primary key default gen_random_uuid(),
    user_id     uuid not null unique references public.users (id) on delete cascade,
    slot_index  int,
    emoji       text not null,
    label       text not null,
    updated_at  timestamptz not null default now()
);
-- In case an older `statuses` table already exists without slot_index.
alter table public.statuses add column if not exists slot_index int;

-- ---------------------------------------------------------------------------
-- reactions (lightweight nudges)
-- type: 'knock' | 'coffee' | 'eyes'
-- ---------------------------------------------------------------------------
create table if not exists public.reactions (
    id          uuid primary key default gen_random_uuid(),
    sender_id   uuid not null references public.users (id) on delete cascade,
    receiver_id uuid not null references public.users (id) on delete cascade,
    type        text not null check (type in ('knock', 'coffee', 'eyes')),
    created_at  timestamptz not null default now()
);

create index if not exists idx_friendships_user on public.friendships (user_id);
create index if not exists idx_friendships_friend on public.friendships (friend_id);
create index if not exists idx_status_slots_user on public.status_slots (user_id);
create index if not exists idx_reactions_receiver on public.reactions (receiver_id);

-- ---------------------------------------------------------------------------
-- Keep updated_at fresh on every UPDATE (so PostgREST callers don't have to).
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end $$;

drop trigger if exists trg_status_slots_updated on public.status_slots;
create trigger trg_status_slots_updated
    before update on public.status_slots
    for each row execute function public.set_updated_at();

drop trigger if exists trg_statuses_updated on public.statuses;
create trigger trg_statuses_updated
    before update on public.statuses
    for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- The backend uses the service_role key (which bypasses RLS), so these policies
-- protect the data if the Supabase client is ever called directly from the app.
-- ---------------------------------------------------------------------------
alter table public.users        enable row level security;
alter table public.friendships  enable row level security;
alter table public.status_slots enable row level security;
alter table public.statuses     enable row level security;
alter table public.reactions    enable row level security;

-- Profiles are readable by any authenticated user; you can only edit your own.
create policy "users_select_all" on public.users
    for select to authenticated using (true);
create policy "users_update_own" on public.users
    for update to authenticated using (auth.uid() = id);

-- Friendships: visible to and creatable by the people involved.
create policy "friendships_select_involved" on public.friendships
    for select to authenticated
    using (auth.uid() = user_id or auth.uid() = friend_id);
create policy "friendships_insert_own" on public.friendships
    for insert to authenticated with check (auth.uid() = user_id);
create policy "friendships_update_recipient" on public.friendships
    for update to authenticated using (auth.uid() = friend_id);

-- Status slots: private to the owner (your draft slots aren't shown to friends).
create policy "status_slots_own" on public.status_slots
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Statuses (active door sign): anyone authenticated can read (app-layer filters
-- to friends; this also lets friends receive Realtime updates); write your own.
create policy "statuses_select_all" on public.statuses
    for select to authenticated using (true);
create policy "statuses_upsert_own" on public.statuses
    for all to authenticated
    using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reactions: you can see ones you sent or received, and only send as yourself.
create policy "reactions_select_involved" on public.reactions
    for select to authenticated
    using (auth.uid() = sender_id or auth.uid() = receiver_id);
create policy "reactions_insert_own" on public.reactions
    for insert to authenticated with check (auth.uid() = sender_id);

-- ---------------------------------------------------------------------------
-- Realtime
-- Friends subscribe to `statuses` so active-status changes appear live (no
-- polling). Add the table to the realtime publication if not already present.
-- ---------------------------------------------------------------------------
do $$
begin
    if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = 'statuses'
    ) then
        alter publication supabase_realtime add table public.statuses;
    end if;
end $$;
