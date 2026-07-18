import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetDayForDate,
  localSaveDay,
  localGetDatesWithWorkouts,
} from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { enqueue, dirtyDates, subscribe } from "@/services/outbox";
import {
  normalizeExercise,
  normalizeSessions,
  deriveLegacyFields,
} from "@/services/setEntries";

export function rowToExercise(row) {
  return normalizeExercise({
    id: row.id,
    name: row.name,
    weight: row.weight ?? "",
    sets: row.sets,
    reps: row.reps,
    notes: row.notes ?? "",
    completedReps: row.completed_reps ?? [],
    setEntries: row.set_data ?? null,
  });
}

// The exercise columns every Supabase write shares: set_data is canonical
// and the legacy columns are re-derived from it, so the two can only
// disagree when a pre-setEntries client wrote last (the read-side staleness
// guard in normalizeExercise handles that).
export function exerciseToDbFields(exercise) {
  const normalized = normalizeExercise(exercise);
  const legacy = deriveLegacyFields(normalized.setEntries);
  return {
    weight: legacy.weight,
    sets: legacy.sets,
    reps: legacy.reps,
    completed_reps: legacy.completedReps,
    set_data: normalized.setEntries,
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
  if (isGuestMode()) return normalizeSessions(localGetDayForDate(dateKey));
  if (dirtyDates().has(dateKey)) {
    return normalizeSessions(cacheStore.getDayForDate(dateKey));
  }
  // A save can land *and flush* while the fetch is in flight; the dirty set
  // alone misses that (the op is already gone by the time the fetch resolves),
  // so watch the outbox for the date being touched at any point mid-fetch.
  let editedMidFetch = false;
  const unsubscribe = subscribe(() => {
    if (dirtyDates().has(dateKey)) editedMidFetch = true;
  });
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
    // A save may have landed while the fetch was in flight; the mirror is
    // newer than what the server returned.
    if (editedMidFetch || dirtyDates().has(dateKey)) {
      return normalizeSessions(cacheStore.getDayForDate(dateKey));
    }
    cacheStore.replaceDay(dateKey, sessions);
    return sessions;
  } catch (err) {
    console.warn("Serving workout day from local cache", err?.message ?? err);
    return normalizeSessions(cacheStore.getDayForDate(dateKey));
  } finally {
    unsubscribe();
  }
}

// Local-first: the mirror is written synchronously and the outbox flush
// (services/sync.js, the only code that pushes signed-in writes) replays the
// day to Supabase — so saves resolve instantly offline and sync on reconnect.
export async function saveDayForDate(dateKey, sessions) {
  // Defensive: persisted exercises always carry canonical setEntries even if
  // a caller slipped a legacy-shaped one into state.
  const normalized = normalizeSessions(sessions);
  if (isGuestMode()) return localSaveDay(dateKey, normalized);
  cacheStore.saveDay(dateKey, normalized);
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
      notes: e.notes ?? "",
      position: i,
      ...exerciseToDbFields(e),
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

// Full history as [{ date, sessions }], for CSV export. Goes through the
// day-level readers so guest/cache/dirty-date handling applies unchanged;
// chunked to bound concurrent Supabase round trips. If exports ever feel
// slow on large signed-in histories, replace with one bulk two-table query.
export async function getAllDays() {
  const dates = (await getDatesWithWorkouts()).sort();
  const days = [];
  const CHUNK = 5;
  for (let i = 0; i < dates.length; i += CHUNK) {
    const chunk = dates.slice(i, i + CHUNK);
    const results = await Promise.all(chunk.map((d) => getDayForDate(d)));
    chunk.forEach((date, j) => days.push({ date, sessions: results[j] }));
  }
  return days;
}

export async function getDatesWithWorkouts() {
  if (isGuestMode()) return localGetDatesWithWorkouts();
  const dirty = dirtyDates();
  const mirrorDates = new Set(cacheStore.getDatesWithWorkouts());
  try {
    // Sessions count too: a timed session with no exercises still marks the
    // date (calendar dots, CSV export, import skip-list).
    const [exercisesRes, sessionsRes] = await Promise.all([
      supabase.from("exercises").select("date"),
      supabase.from("workout_sessions").select("date"),
    ]);
    if (exercisesRes.error) throw exercisesRes.error;
    if (sessionsRes.error) throw sessionsRes.error;
    // Dirty dates take the mirror's truth: an offline delete removes the
    // date even though the server still lists it, and vice versa.
    const dates = new Set(
      [...exercisesRes.data, ...sessionsRes.data]
        .map((r) => r.date)
        .filter((d) => !dirty.has(d) || mirrorDates.has(d)),
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
