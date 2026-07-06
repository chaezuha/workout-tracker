import { subMonths, subYears } from "date-fns";
import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetAllExerciseRows,
  localGetAllSessionRows,
} from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
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

export function filterRowsByRange(rows, rangeValue) {
  const startKey = rangeStartKey(rangeValue);
  if (!startKey) return rows;
  return rows.filter((row) => row.date >= startKey);
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

// Rows must be sorted date desc / position desc so the first casing seen per
// lowercased name is the latest logged one (same rule as toSuggestions).
// Rows with no logged reps are preplanned exercises and are excluded.
export function aggregateStats(rows) {
  const byName = new Map();
  const allDates = new Set();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const reps = loggedReps(row);
    if (!reps.length) continue;
    allDates.add(row.date);

    const key = name.toLowerCase();
    let entry = byName.get(key);
    if (!entry) {
      entry = { key, name, volume: 0, bestWeight: 0, bestOneRepMax: 0, dates: new Set() };
      byName.set(key, entry);
    }

    const weight = row.weight ?? 0;
    entry.volume += reps.reduce((sum, r) => sum + r, 0) * weight;
    entry.bestWeight = Math.max(entry.bestWeight, weight);
    for (const r of reps) {
      entry.bestOneRepMax = Math.max(
        entry.bestOneRepMax,
        estimateOneRepMax(weight, r),
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
    totals: {
      totalVolume: exercises.reduce((sum, e) => sum + e.volume, 0),
      exercises: exercises.length,
      sessions: allDates.size,
    },
  };
}

export async function getAllStatsRows() {
  if (isGuestMode()) return localGetAllExerciseRows();
  try {
    const { data, error } = await supabase
      .from("exercises")
      .select("name, weight, sets, reps, completed_reps, date, position")
      .order("date", { ascending: false })
      .order("position", { ascending: false });
    if (error) throw error;
    return data.map(({ completed_reps, ...row }) => ({
      ...row,
      completedReps: completed_reps ?? [],
    }));
  } catch (err) {
    console.warn("Serving stats from local cache", err?.message ?? err);
    return cacheStore.getAllExerciseRows();
  }
}

// A session only counts if it was actually used: the timer ran, or the date
// has a completed exercise. Preplanned sessions contribute nothing either way
// since their duration is 0.
export function aggregateSessionTotals(sessionRows, trainedDates = new Set()) {
  return {
    count: sessionRows.filter(
      (row) => (row.durationSeconds ?? 0) > 0 || trainedDates.has(row.date),
    ).length,
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
      .select("date, duration_seconds")
      .order("date", { ascending: false });
    if (error) throw error;
    return data.map((row) => ({
      date: row.date,
      durationSeconds: row.duration_seconds ?? 0,
    }));
  } catch (err) {
    console.warn("Serving session stats from local cache", err?.message ?? err);
    return cacheStore.getAllSessionRows();
  }
}
