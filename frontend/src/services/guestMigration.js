import { supabase } from "@/lib/supabase";
import { clearGuestData } from "@/lib/guestMode";
import {
  localHasGuestData,
  localGetDayForDate,
  localGetDatesWithWorkouts,
  localGetAllSessionRows,
  localGetCheckinDates,
  localGetTemplates,
} from "@/services/localStore";
import { exerciseToDbFields } from "@/services/workouts";

// One-time import of guest localStorage data into the signed-in user's
// Supabase account. Guest ids are already UUIDs, so rows keep their ids and
// every write is an upsert (or duplicate-ignoring insert) — a retry after a
// partial failure re-runs safely without duplicating rows.

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function hasMigratableGuestData() {
  return localHasGuestData();
}

// jsonb re-sorts object keys, so compare with key order normalized.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((k) => [k, canonical(value[k])]),
    );
  }
  return value;
}

function sameExercises(a, b) {
  return JSON.stringify(canonical(a ?? [])) === JSON.stringify(canonical(b ?? []));
}

export async function migrateGuestDataToAccount() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  // Ancient guest data could predate UUID ids; remap those consistently so
  // session→exercise links survive.
  const idMap = new Map();
  const idFor = (id) => {
    if (UUID_RE.test(id ?? "")) return id;
    if (!idMap.has(id)) idMap.set(id, crypto.randomUUID());
    return idMap.get(id);
  };

  // localGetAllSessionRows already unions in workout-only dates, but keep the
  // explicit union so neither source depends on the other's quirks.
  const dates = [
    ...new Set([
      ...localGetDatesWithWorkouts(),
      ...localGetAllSessionRows().map((r) => r.date),
    ]),
  ];

  const sessionRows = [];
  const exerciseRows = [];
  for (const date of dates) {
    // localGetDayForDate normalizes legacy data (missing sessions, dangling
    // sessionIds) on read, so every exercise arrives attached to a session.
    for (const s of localGetDayForDate(date)) {
      sessionRows.push({
        id: idFor(s.id),
        user_id: user.id,
        date,
        name: s.name,
        position: s.position,
        duration_seconds: s.durationSeconds ?? 0,
        created_at: s.createdAt ?? new Date().toISOString(),
      });
      s.exercises.forEach((e, i) => {
        exerciseRows.push({
          id: idFor(e.id),
          user_id: user.id,
          date,
          session_id: idFor(s.id),
          name: e.name,
          notes: e.notes ?? "",
          position: i,
          ...exerciseToDbFields(e),
        });
      });
    }
  }

  if (sessionRows.length) {
    const { error } = await supabase
      .from("workout_sessions")
      .upsert(sessionRows);
    if (error) throw error;
  }
  if (exerciseRows.length) {
    const { error } = await supabase.from("exercises").upsert(exerciseRows);
    if (error) throw error;
  }

  const checkinDates = localGetCheckinDates();
  if (checkinDates.length) {
    const { error } = await supabase.from("checkins").upsert(
      checkinDates.map((date) => ({ user_id: user.id, date })),
      { ignoreDuplicates: true },
    );
    if (error) throw error;
  }

  // Custom templates only; untouched samples stay behind (editing a sample
  // drops its isSample flag, so edited ones migrate).
  const guestTemplates = localGetTemplates().filter((t) => !t.isSample);
  let templateRows = [];
  if (guestTemplates.length) {
    const { data: existing, error } = await supabase
      .from("workout_templates")
      .select("name, exercises");
    if (error) throw error;

    const names = new Set(existing.map((t) => t.name));
    for (const t of guestTemplates) {
      const match = existing.find((a) => a.name === t.name);
      if (match && sameExercises(match.exercises, t.exercises)) continue;
      let name = t.name;
      for (let n = 2; names.has(name); n++) {
        name = n === 2 ? `${t.name} (imported)` : `${t.name} (imported ${n - 1})`;
      }
      names.add(name);
      templateRows.push({ user_id: user.id, name, exercises: t.exercises ?? [] });
    }
    if (templateRows.length) {
      const { error: insertError } = await supabase
        .from("workout_templates")
        .insert(templateRows);
      if (insertError) throw insertError;
    }
  }

  clearGuestData();

  return {
    workoutDays: dates.length,
    sessions: sessionRows.length,
    exercises: exerciseRows.length,
    checkins: checkinDates.length,
    templates: templateRows.length,
  };
}
