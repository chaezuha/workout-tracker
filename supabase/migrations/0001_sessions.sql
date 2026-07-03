-- Sessions: each day splits into sessions that own exercises and carry an
-- accumulated timer duration. Run manually in the Supabase SQL editor.

-- 1) The session entity (ids are generated client-side, hence no default
--    needed, but one is set for safety)
create table if not exists workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  -- date (not text): matches the exercises.date column type
  date date not null,
  name text,
  position integer not null default 0,
  -- The app upserts session rows without duration_seconds so a day-save can
  -- never clobber a timer accumulation; only add_session_duration writes it.
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_date_idx
  on workout_sessions (user_id, date);

alter table workout_sessions enable row level security;

drop policy if exists "workout_sessions_select" on workout_sessions;
create policy "workout_sessions_select" on workout_sessions
  for select using (auth.uid() = user_id);

drop policy if exists "workout_sessions_insert" on workout_sessions;
create policy "workout_sessions_insert" on workout_sessions
  for insert with check (auth.uid() = user_id);

drop policy if exists "workout_sessions_update" on workout_sessions;
create policy "workout_sessions_update" on workout_sessions
  for update using (auth.uid() = user_id);

drop policy if exists "workout_sessions_delete" on workout_sessions;
create policy "workout_sessions_delete" on workout_sessions
  for delete using (auth.uid() = user_id);

-- 2) Link exercises to sessions
alter table exercises
  add column if not exists session_id uuid references workout_sessions(id) on delete set null;

create index if not exists exercises_session_id_idx on exercises(session_id);

-- 3) Backfill: create a session for every (user, date) that has exercises
--    but no session row
insert into workout_sessions (user_id, date, duration_seconds, position)
select distinct e.user_id, e.date, 0, 0
from exercises e
where not exists (
  select 1 from workout_sessions ws
  where ws.user_id = e.user_id and ws.date = e.date
);

-- 4) Attach all unassigned exercises to the first session of their day
update exercises e
set session_id = ws.id
from workout_sessions ws
where e.session_id is null
  and ws.user_id = e.user_id
  and ws.date = e.date
  and ws.position = 0;

-- 5) Atomic duration accumulation (RLS applies: security invoker)
create or replace function add_session_duration(p_session_id uuid, p_seconds integer)
returns integer
language sql
security invoker
as $$
  update workout_sessions
  set duration_seconds = duration_seconds + p_seconds
  where id = p_session_id
  returning duration_seconds;
$$;
