import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetDayForDate,
  localSaveDay,
  localGetDatesWithWorkouts,
} from "@/services/localStore";

function rowToExercise(row) {
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

function rowToSession(row) {
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
export async function getDayForDate(dateKey) {
  if (isGuestMode()) return localGetDayForDate(dateKey);
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
  return sessions;
}

export async function saveDayForDate(dateKey, sessions) {
  if (isGuestMode()) return localSaveDay(dateKey, sessions);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  // duration_seconds is deliberately omitted from the upsert: only the timer
  // path (add_session_duration) writes it, so a day-save started before a
  // timer stop can never clobber the accumulated duration.
  const sessionRows = (sessions ?? []).map((s, i) => ({
    id: s.id,
    user_id: user.id,
    date: dateKey,
    name: s.name?.trim() || null,
    position: i,
  }));

  // Exercise positions are per-session; session order comes from
  // workout_sessions.position.
  const exerciseRows = (sessions ?? []).flatMap((s) =>
    s.exercises.map((e, i) => ({
      id: e.id,
      user_id: user.id,
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
  const { data, error } = await supabase.from("exercises").select("date");
  if (error) throw error;
  return [...new Set(data.map((r) => r.date))];
}
