-- Base schema: the tables the app needs before 0001_sessions.sql runs.
-- Run manually in the Supabase SQL editor, before 0001. Everything is
-- guarded with "if not exists", so running it against a project that
-- already has these tables is a no-op.

-- 1) Exercises: one row per exercise on a day. session_id is added by
--    0001_sessions.sql, which is why it is absent here.
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  name text not null,
  weight numeric,
  sets integer not null,
  reps integer not null,
  notes text not null default '',
  completed_reps jsonb not null default '[]'::jsonb,
  position integer not null default 0
);

create index if not exists exercises_user_date_idx on exercises (user_id, date);

alter table exercises enable row level security;

drop policy if exists "exercises_select" on exercises;
create policy "exercises_select" on exercises
  for select using (auth.uid() = user_id);

drop policy if exists "exercises_insert" on exercises;
create policy "exercises_insert" on exercises
  for insert with check (auth.uid() = user_id);

drop policy if exists "exercises_update" on exercises;
create policy "exercises_update" on exercises
  for update using (auth.uid() = user_id);

drop policy if exists "exercises_delete" on exercises;
create policy "exercises_delete" on exercises
  for delete using (auth.uid() = user_id);

-- 2) Check-ins: presence of a (user, date) row is the check-in.
create table if not exists checkins (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  primary key (user_id, date)
);

alter table checkins enable row level security;

drop policy if exists "checkins_select" on checkins;
create policy "checkins_select" on checkins
  for select using (auth.uid() = user_id);

drop policy if exists "checkins_insert" on checkins;
create policy "checkins_insert" on checkins
  for insert with check (auth.uid() = user_id);

drop policy if exists "checkins_update" on checkins;
create policy "checkins_update" on checkins
  for update using (auth.uid() = user_id);

drop policy if exists "checkins_delete" on checkins;
create policy "checkins_delete" on checkins
  for delete using (auth.uid() = user_id);

-- 3) Workout templates. The unique (user_id, name) constraint matters: the
--    sync layer relies on error 23505 to detect cross-device name collisions.
create table if not exists workout_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  exercises jsonb not null default '[]'::jsonb,
  unique (user_id, name)
);

alter table workout_templates enable row level security;

drop policy if exists "workout_templates_select" on workout_templates;
create policy "workout_templates_select" on workout_templates
  for select using (auth.uid() = user_id);

drop policy if exists "workout_templates_insert" on workout_templates;
create policy "workout_templates_insert" on workout_templates
  for insert with check (auth.uid() = user_id);

drop policy if exists "workout_templates_update" on workout_templates;
create policy "workout_templates_update" on workout_templates
  for update using (auth.uid() = user_id);

drop policy if exists "workout_templates_delete" on workout_templates;
create policy "workout_templates_delete" on workout_templates
  for delete using (auth.uid() = user_id);
