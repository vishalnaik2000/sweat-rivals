# Data model (Supabase / Postgres)

The target schema for the multi-user phase. Identity/auth is owned by **Supabase Auth**
(`auth.users` — passwords, Google sign-in, email). Everything below is application data.

**Security boundary = Row-Level Security.** Every table has RLS on; the policies (bottom)
are the *only* thing stopping one user from reading another's private data. Frontend checks
are convenience, never authorization. The catalog is seeded with the `service_role` key
(bypasses RLS); end users never use that key.

## Entities

| Table | What it is |
|---|---|
| `profiles` | Public identity mirror of `auth.users` — username, name, avatar. Searchable (Instagram-style). |
| `metric_defs` | Metric definitions = the catalog **and** user-created custom metrics. (What `HABITS` becomes.) |
| `user_metrics` | Subscriptions: which metrics a user tracks. Auto-subscribe writes here. |
| `entries` | The daily log. High-volume table. (The localStorage `entries` shape, normalized.) |
| `challenges` | A competition: name, window, participant cap, status. |
| `challenge_participants` | Membership + invites (by existing user **or** by email). |
| `challenge_metrics` | Which metric_defs a challenge competes on. |

## DDL

```sql
create extension if not exists citext;     -- case-insensitive usernames
create extension if not exists pg_trgm;    -- fuzzy name/username search

-- 1. profiles ---------------------------------------------------------------
-- Public fields only. NO email here (email lives in auth.users; keeping it out
-- means username/name/avatar can be world-searchable without leaking emails).
create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  username    citext unique not null,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
create index profiles_username_trgm on profiles using gin (username gin_trgm_ops);
create index profiles_name_trgm     on profiles using gin (name gin_trgm_ops);

-- 2. metric_defs ------------------------------------------------------------
-- owner_id NULL          = global catalog (curated, everyone sees)
-- owner_id set + private = personal custom metric
-- owner_id set + public  = custom metric the creator chose to share/make searchable
create table metric_defs (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references profiles(id) on delete cascade,
  slug         text not null,
  label        text not null,
  emoji        text,
  type         text not null check (type in ('bool','counter','number','scale','text')),
  unit         text,
  direction    text check (direction in ('higher','lower')),   -- nullable for text
  aggregation  text not null default 'sum'
                 check (aggregation in ('sum','average','count')),
  visibility   text not null default 'private'
                 check (visibility in ('private','public')),
  config       jsonb not null default '{}',   -- type-specific: {step, max, ...}
  created_at   timestamptz not null default now()
);

-- 3. user_metrics (subscriptions) ------------------------------------------
create table user_metrics (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  metric_def_id uuid not null references metric_defs(id) on delete cascade,
  sort_order    int not null default 0,
  active        boolean not null default true,
  created_at    timestamptz not null default now(),
  unique (user_id, metric_def_id)
);

-- 4. entries (the daily log) -----------------------------------------------
-- Keyed by (user, metric, day) NOT by subscription, so unsubscribe/resubscribe
-- never orphans history. One numeric `value` for all quantitative types
-- (bool 0/1, scale 1..max, counter/number numeric); `note` only for type='text'.
create table entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references profiles(id) on delete cascade,
  metric_def_id uuid not null references metric_defs(id) on delete cascade,
  day           date not null,
  value         numeric,
  note          text,
  updated_at    timestamptz not null default now(),
  unique (user_id, metric_def_id, day)
);
create index entries_user_day   on entries (user_id, day);
create index entries_metric_day on entries (metric_def_id, day);

-- 5. challenges -------------------------------------------------------------
create table challenges (
  id               uuid primary key default gen_random_uuid(),
  creator_id       uuid not null references profiles(id) on delete cascade,
  name             text not null,
  start_date       date not null,
  end_date         date not null,
  max_participants int not null default 10 check (max_participants between 2 and 10),
  status           text not null default 'draft'
                     check (status in ('draft','active','ended')),
  created_at       timestamptz not null default now()
);

-- 6. challenge_participants -------------------------------------------------
-- Invite an existing user (user_id) OR a not-yet-signed-up person (invited_email).
-- On sign-up, a server routine matches the new auth email to pending invites.
create table challenge_participants (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  user_id       uuid references profiles(id) on delete cascade,  -- null until accepted via email
  invited_email text,
  invited_by    uuid references profiles(id),
  status        text not null default 'invited'
                  check (status in ('invited','accepted','declined')),
  joined_at     timestamptz,
  created_at    timestamptz not null default now(),
  check (user_id is not null or invited_email is not null),
  unique (challenge_id, user_id)
);
create unique index challenge_participants_email
  on challenge_participants (challenge_id, lower(invited_email))
  where invited_email is not null;

-- 7. challenge_metrics ------------------------------------------------------
create table challenge_metrics (
  id            uuid primary key default gen_random_uuid(),
  challenge_id  uuid not null references challenges(id) on delete cascade,
  metric_def_id uuid not null references metric_defs(id) on delete cascade,
  added_at      timestamptz not null default now(),
  unique (challenge_id, metric_def_id)
);
```

## Helper functions

`security definer` so they bypass RLS internally — this prevents infinite recursion when
a policy on a table needs to query that same table.

```sql
create or replace function is_participant(c uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from challenge_participants
    where challenge_id = c and user_id = auth.uid() and status = 'accepted'
  );
$$;

create or replace function is_creator(c uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from challenges where id = c and creator_id = auth.uid()
  );
$$;

-- The crux: may auth.uid() read THIS entry row (belonging to `owner`)?
-- Only if it's a challenge metric of a challenge they share, within its window.
create or replace function can_read_challenge_entry(m uuid, owner uuid, d date)
returns boolean language sql security definer stable as $$
  select exists (
    select 1
    from challenge_metrics cm
    join challenges c               on c.id = cm.challenge_id
    join challenge_participants me  on me.challenge_id = c.id
    join challenge_participants them on them.challenge_id = c.id
    where cm.metric_def_id = m
      and me.user_id = auth.uid() and me.status = 'accepted'
      and them.user_id = owner    and them.status = 'accepted'
      and d between c.start_date and c.end_date
  );
$$;
```

## RLS policies

```sql
alter table profiles               enable row level security;
alter table metric_defs            enable row level security;
alter table user_metrics           enable row level security;
alter table entries                enable row level security;
alter table challenges             enable row level security;
alter table challenge_participants enable row level security;
alter table challenge_metrics      enable row level security;

-- profiles: public fields readable by any signed-in user (powers search); write own only
create policy profiles_read   on profiles for select to authenticated using (true);
create policy profiles_write  on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid());

-- metric_defs: see catalog + public + own + any referenced by a challenge you're in
create policy metric_defs_read on metric_defs for select to authenticated using (
  owner_id is null
  or visibility = 'public'
  or owner_id = auth.uid()
  or exists (
    select 1 from challenge_metrics cm
    where cm.metric_def_id = metric_defs.id and is_participant(cm.challenge_id)
  )
);
create policy metric_defs_insert on metric_defs for insert to authenticated
  with check (owner_id = auth.uid());           -- catalog seeded via service_role
create policy metric_defs_modify on metric_defs for update to authenticated
  using (owner_id = auth.uid());
create policy metric_defs_delete on metric_defs for delete to authenticated
  using (owner_id = auth.uid());

-- user_metrics: fully private to the owner
create policy user_metrics_all on user_metrics for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- entries: own rows always; others' rows only through the challenge window
create policy entries_read on entries for select to authenticated using (
  user_id = auth.uid()
  or can_read_challenge_entry(metric_def_id, user_id, day)
);
create policy entries_write on entries for insert to authenticated
  with check (user_id = auth.uid());
create policy entries_update on entries for update to authenticated
  using (user_id = auth.uid());
create policy entries_delete on entries for delete to authenticated
  using (user_id = auth.uid());

-- challenges: creator or accepted participant can see; only creator mutates
create policy challenges_read   on challenges for select to authenticated
  using (creator_id = auth.uid() or is_participant(id));
create policy challenges_insert on challenges for insert to authenticated
  with check (creator_id = auth.uid());
create policy challenges_modify on challenges for update to authenticated
  using (creator_id = auth.uid());
create policy challenges_delete on challenges for delete to authenticated
  using (creator_id = auth.uid());

-- challenge_participants: members see the roster; creator invites; you accept/decline your row
create policy cp_read   on challenge_participants for select to authenticated
  using (user_id = auth.uid() or is_participant(challenge_id) or is_creator(challenge_id));
create policy cp_invite on challenge_participants for insert to authenticated
  with check (is_creator(challenge_id));
create policy cp_respond on challenge_participants for update to authenticated
  using (user_id = auth.uid() or is_creator(challenge_id));
create policy cp_remove  on challenge_participants for delete to authenticated
  using (is_creator(challenge_id));

-- challenge_metrics: members read; creator edits (add/drop mid-challenge)
create policy cm_read   on challenge_metrics for select to authenticated
  using (is_participant(challenge_id) or is_creator(challenge_id));
create policy cm_insert on challenge_metrics for insert to authenticated
  with check (is_creator(challenge_id));
create policy cm_delete on challenge_metrics for delete to authenticated
  using (is_creator(challenge_id));
```

## Scoring (computed at read time — not stored)

For each challenge metric, per participant, over `[start_date, end_date]`:

1. Pull the participant's `entries` for that metric in the window.
2. Roll up daily values by the metric's `aggregation`.
3. **Missing-day rule** (keeps a no-log day neutral):
   - `average` / `sum` → impute the missing day as the participant's **own logged-day average** (leaves their average unchanged; scales sum to full participation so partial loggers aren't unfairly tiny).
   - `count` → a missing day counts as **0** (the one exception — imputing would defeat the point of counting occurrences).
4. Rank participants by the rolled-up number, respecting `direction` (`higher`/`lower` wins).

One leaderboard **per metric**; comparison is **absolute** (no baseline/improvement). No
combined cross-metric score yet.
```
```

## Open / later

- Combined cross-metric scoring (currently per-metric only).
- Per-user metric overrides (e.g. personal target) on `user_metrics` if needed.
- Server routine that links pending `invited_email` rows to a profile on sign-up.
