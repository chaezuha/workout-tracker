-- Per-set logging: canonical set data lives in a jsonb column alongside the
-- legacy per-exercise columns (weight/sets/reps/completed_reps), which new
-- clients keep re-deriving on every save so old clients stay operable.
-- Shape: [{ "weight": 135, "targetReps": 8, "reps": 8, "type": "working",
--           "rpe": 8.5 }, ...]; null marks a row last written by a legacy
-- client (synthesized on read).
--
-- Run this BEFORE deploying a frontend that writes set_data.
alter table exercises add column if not exists set_data jsonb;
