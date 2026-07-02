import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetWorkoutsForDate,
  localSaveWorkoutsForDate,
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

export async function getWorkoutsForDate(dateKey) {
  if (isGuestMode()) return localGetWorkoutsForDate(dateKey);
  const { data, error } = await supabase
    .from("exercises")
    .select("*")
    .eq("date", dateKey)
    .order("position", { ascending: true });
  if (error) throw error;
  return data.map(rowToExercise);
}

export async function saveWorkoutsForDate(dateKey, exercises) {
  if (isGuestMode()) return localSaveWorkoutsForDate(dateKey, exercises);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const rows = (exercises ?? []).map((e, i) => ({
    id: e.id,
    user_id: user.id,
    date: dateKey,
    name: e.name,
    weight: e.weight === "" || e.weight == null ? null : Number(e.weight),
    sets: Number(e.sets),
    reps: Number(e.reps),
    notes: e.notes ?? "",
    completed_reps: e.completedReps ?? [],
    position: i,
  }));

  if (rows.length) {
    const { error } = await supabase.from("exercises").upsert(rows);
    if (error) throw error;
  }

  const keepIds = (exercises ?? []).map((e) => e.id);
  let del = supabase.from("exercises").delete().eq("date", dateKey);
  if (keepIds.length) {
    del = del.not("id", "in", `(${keepIds.join(",")})`);
  }
  const { error: delErr } = await del;
  if (delErr) throw delErr;
}

export async function getDatesWithWorkouts() {
  if (isGuestMode()) return localGetDatesWithWorkouts();
  const { data, error } = await supabase.from("exercises").select("date");
  if (error) throw error;
  return [...new Set(data.map((r) => r.date))];
}
