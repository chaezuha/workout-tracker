import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetDayForDate,
  localSaveDay,
  localGetDatesWithWorkouts,
} from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { enqueue, dirtyDates } from "@/services/outbox";

export function rowToExercise(row) {
  return {
    id: row.id,
    name: row.name,
    weight: row.weight ?? "",
    sets: row.sets,
    reps: row.reps,
    notes: row.notes ?? "",
    completedReps: row.completed_reps ?? [],
  };
}

export function rowToSession(row) {
  return {
    id: row.id,
    name: row.name ?? null,
    position: row.position ?? 0,
    durationSeconds: row.duration_seconds ?? 0,
    createdAt: row.created_at,
    exercises: [],
  };
}

// A day is a list of sessions, each owning its exercises in order.
// Signed-in reads go server-first, refreshing the local mirror on the way;
// days with unsynced edits (or any fetch failure) are served from the mirror.
export async function getDayForDate(dateKey) {
  if (isGuestMode()) return localGetDayForDate(dateKey);
  if (dirtyDates().has(dateKey)) return cacheStore.getDayForDate(dateKey);
  try {
    const [sessionsRes, exercisesRes] = await Promise.all([
      supabase
        .from("workout_sessions")
        .select("*")
        .eq("date", dateKey)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true }),
      supabase
        .from("exercises")
        .select("*")
        .eq("date", dateKey)
        .order("position", { ascending: true }),
    ]);
    if (sessionsRes.error) throw sessionsRes.error;
    if (exercisesRes.error) throw exercisesRes.error;

    const sessions = sessionsRes.data.map(rowToSession);
    if (!sessions.length && exercisesRes.data.length) {
      // Pre-migration data that the backfill missed; group it into one session.
      sessions.push({
        id: crypto.randomUUID(),
        name: null,
        position: 0,
        durationSeconds: 0,
        createdAt: new Date().toISOString(),
        exercises: [],
      });
    }
    const byId = new Map(sessions.map((s) => [s.id, s]));
    for (const row of exercisesRes.data) {
      const session = byId.get(row.session_id) ?? sessions[0];
      session.exercises.push(rowToExercise(row));
    }
    // A save may have landed while the fetch was in flight; the now-dirty
    // mirror is newer than what the server returned.
    if (dirtyDates().has(dateKey)) return cacheStore.getDayForDate(dateKey);
    cacheStore.replaceDay(dateKey, sessions);
    return sessions;
  } catch (err) {
    console.warn("Serving workout day from local cache", err?.message ?? err);
    return cacheStore.getDayForDate(dateKey);
  }
}

// Local-first: the mirror is written synchronously and the outbox flush
// (services/sync.js, the only code that pushes signed-in writes) replays the
// day to Supabase — so saves resolve instantly offline and sync on reconnect.
export async function saveDayForDate(dateKey, sessions) {
  if (isGuestMode()) return localSaveDay(dateKey, sessions);
  cacheStore.saveDay(dateKey, sessions);
  enqueue({ type: "saveDay", dateKey });
}

// The Supabase write path for a whole day, shared by the outbox flush.
// duration_seconds is deliberately omitted from the upsert: only the timer
// path (add_session_duration) writes it, so a day-save started before a
// timer stop can never clobber the accumulated duration.
export async function pushDayToSupabase(dateKey, sessions, userId) {
  const sessionRows = (sessions ?? []).map((s, i) => ({
    id: s.id,
    user_id: userId,
    date: dateKey,
    name: s.name?.trim() || null,
    position: i,
  }));

  // Exercise positions are per-session; session order comes from
  // workout_sessions.position.
  const exerciseRows = (sessions ?? []).flatMap((s) =>
    s.exercises.map((e, i) => ({
      id: e.id,
      user_id: userId,
      date: dateKey,
      session_id: s.id,
      name: e.name,
      weight: e.weight === "" || e.weight == null ? null : Number(e.weight),
      sets: Number(e.sets),
      reps: Number(e.reps),
      notes: e.notes ?? "",
      completed_reps: e.completedReps ?? [],
      position: i,
    })),
  );

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

  const keepExerciseIds = exerciseRows.map((r) => r.id);
  let delEx = supabase.from("exercises").delete().eq("date", dateKey);
  if (keepExerciseIds.length) {
    delEx = delEx.not("id", "in", `(${keepExerciseIds.join(",")})`);
  }
  const { error: delExErr } = await delEx;
  if (delExErr) throw delExErr;

  const keepSessionIds = (sessions ?? []).map((s) => s.id);
  let delSes = supabase.from("workout_sessions").delete().eq("date", dateKey);
  if (keepSessionIds.length) {
    delSes = delSes.not("id", "in", `(${keepSessionIds.join(",")})`);
  }
  const { error: delSesErr } = await delSes;
  if (delSesErr) throw delSesErr;
}

export async function getDatesWithWorkouts() {
  if (isGuestMode()) return localGetDatesWithWorkouts();
  const dirty = dirtyDates();
  const mirrorDates = new Set(cacheStore.getDatesWithWorkouts());
  try {
    const { data, error } = await supabase.from("exercises").select("date");
    if (error) throw error;
    // Dirty dates take the mirror's truth: an offline delete removes the
    // date even though the server still lists it, and vice versa.
    const dates = new Set(
      data.map((r) => r.date).filter((d) => !dirty.has(d) || mirrorDates.has(d)),
    );
    for (const d of dirty) {
      if (mirrorDates.has(d)) dates.add(d);
    }
    return [...dates];
  } catch (err) {
    console.warn("Serving workout dates from local cache", err?.message ?? err);
    return [...mirrorDates];
  }
}
