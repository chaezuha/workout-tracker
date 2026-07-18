import { subMonths, subYears } from "date-fns";
import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetAllExerciseRows,
  localGetAllSessionRows,
} from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { dirtyDates } from "@/services/outbox";
import { normalizeExercise } from "@/services/setEntries";
import { addDays, toDateKey } from "@/lib/dates";

export function estimateOneRepMax(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "6m", label: "Last 6 months" },
  { value: "1y", label: "Last year" },
  { value: "all", label: "All time" },
];

// Inclusive lower bound as a "YYYY-MM-DD" key, or null for no filter.
export function rangeStartKey(rangeValue, now = new Date()) {
  switch (rangeValue) {
    case "today":
      return toDateKey(now);
    case "7d":
      return toDateKey(addDays(now, -6));
    case "30d":
      return toDateKey(addDays(now, -29));
    case "6m":
      return toDateKey(subMonths(now, 6));
    case "1y":
      return toDateKey(subYears(now, 1));
    default:
      return null;
  }
}

// Bounded ranges are capped at today so a mistakenly future-dated workout
// can't inflate "Today" or "Last 7 days"; "All time" stays unfiltered.
export function filterRowsByRange(rows, rangeValue, now = new Date()) {
  const startKey = rangeStartKey(rangeValue, now);
  if (!startKey) return rows;
  const endKey = toDateKey(now);
  return rows.filter((row) => row.date >= startKey && row.date <= endKey);
}

// Reps actually logged via the Reps dialog. Values come from text inputs as
// strings; entries beyond the planned set count are stale logs from a
// since-reduced set count and don't count.
export function loggedReps(row) {
  const setCount = Number(row.sets);
  const logged = row.completedReps ?? [];
  const capped =
    Number.isFinite(setCount) && setCount > 0
      ? logged.slice(0, setCount)
      : logged;
  return capped.map(Number).filter((r) => Number.isFinite(r) && r > 0);
}

// The logged sets as canonical entries ({ weight, targetReps, reps, type,
// rpe }); legacy rows synthesize entries on the fly, so per-set math over
// them degenerates to exactly the old single-weight formulas.
export function loggedSets(row) {
  return normalizeExercise(row).setEntries.filter((en) => en.reps != null);
}

// Rows must be sorted date desc / position desc so the first casing seen per
// lowercased name is the latest logged one (same rule as toSuggestions).
// Rows with no logged reps are preplanned exercises and are excluded.
export function aggregateStats(rows) {
  const byName = new Map();
  const allDates = new Set();
  const trainedSessionIds = new Set();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const sets = loggedSets(row);
    if (!sets.length) continue;
    allDates.add(row.date);
    if (row.sessionId) trainedSessionIds.add(row.sessionId);

    const key = name.toLowerCase();
    let entry = byName.get(key);
    if (!entry) {
      entry = { key, name, volume: 0, bestWeight: 0, bestOneRepMax: 0, dates: new Set() };
      byName.set(key, entry);
    }

    // Volume counts every logged set (warm-ups included — it's work done);
    // bests exclude warm-ups so a heavy warm-up single can't set a record.
    for (const en of sets) {
      entry.volume += en.reps * (en.weight ?? 0);
    }
    for (const en of sets) {
      if (en.type === "warmup") continue;
      entry.bestWeight = Math.max(entry.bestWeight, en.weight ?? 0);
      entry.bestOneRepMax = Math.max(
        entry.bestOneRepMax,
        estimateOneRepMax(en.weight ?? 0, en.reps),
      );
    }
    entry.dates.add(row.date);
  }

  const exercises = [...byName.values()]
    .map(({ dates, ...rest }) => ({
      ...rest,
      days: dates.size,
      dateKeys: [...dates].sort(),
    }))
    .sort((a, b) => b.volume - a.volume);

  return {
    exercises,
    trainedDates: allDates,
    trainedSessionIds,
    totals: {
      totalVolume: exercises.reduce((sum, e) => sum + e.volume, 0),
      exercises: exercises.length,
      sessions: allDates.size,
    },
  };
}

export async function getAllStatsRows() {
  if (isGuestMode()) return localGetAllExerciseRows().map(normalizeExercise);
  try {
    const { data, error } = await supabase
      .from("exercises")
      .select("name, weight, sets, reps, completed_reps, set_data, session_id, date, position")
      .order("date", { ascending: false })
      .order("position", { ascending: false });
    if (error) throw error;
    const rows = data.map(({ completed_reps, set_data, session_id, ...row }) => ({
      ...row,
      completedReps: completed_reps ?? [],
      setEntries: set_data ?? null,
      sessionId: session_id ?? null,
    }));
    // Dates with unsynced edits are served from the mirror, matching
    // getDayForDate — otherwise yesterday's offline workout is invisible to
    // stats, PR baselines, and progression hints until the outbox flushes.
    const dirty = dirtyDates();
    if (!dirty.size) return rows.map(normalizeExercise);
    const merged = rows
      .filter((r) => !dirty.has(r.date))
      .concat(cacheStore.getAllExerciseRows().filter((r) => dirty.has(r.date)))
      .sort((a, b) =>
        a.date === b.date ? b.position - a.position : b.date.localeCompare(a.date),
      );
    return merged.map(normalizeExercise);
  } catch (err) {
    console.warn("Serving stats from local cache", err?.message ?? err);
    return cacheStore.getAllExerciseRows().map(normalizeExercise);
  }
}

// A session only counts if it was actually used: the timer ran, or one of
// its own exercises has logged reps. Preplanned sessions contribute nothing
// either way since their duration is 0. Synthetic pre-migration rows carry no
// id and fall back to the date-wide check.
export function aggregateSessionTotals(
  sessionRows,
  { trainedSessionIds = new Set(), trainedDates = new Set() } = {},
) {
  const used = (row) => {
    if ((row.durationSeconds ?? 0) > 0) return true;
    if (row.id != null) return trainedSessionIds.has(row.id);
    return trainedDates.has(row.date);
  };
  return {
    count: sessionRows.filter(used).length,
    totalSeconds: sessionRows.reduce(
      (sum, row) => sum + (row.durationSeconds ?? 0),
      0,
    ),
  };
}

// Session rows share the exercise-row date key ("YYYY-MM-DD"), so
// filterRowsByRange works on both.
export async function getAllSessionRows() {
  if (isGuestMode()) return localGetAllSessionRows();
  try {
    const { data, error } = await supabase
      .from("workout_sessions")
      .select("id, date, duration_seconds")
      .order("date", { ascending: false });
    if (error) throw error;
    return data.map((row) => ({
      id: row.id,
      date: row.date,
      durationSeconds: row.duration_seconds ?? 0,
    }));
  } catch (err) {
    console.warn("Serving session stats from local cache", err?.message ?? err);
    return cacheStore.getAllSessionRows();
  }
}
