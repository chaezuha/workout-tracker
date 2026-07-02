import { subMonths, subYears } from "date-fns";
import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import { localGetAllExerciseRows } from "@/services/localStore";
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

// Rows must be sorted date desc / position desc so the first casing seen per
// lowercased name is the latest logged one (same rule as toSuggestions).
export function aggregateStats(rows) {
  const byName = new Map();
  const allDates = new Set();

  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    allDates.add(row.date);

    const key = name.toLowerCase();
    let entry = byName.get(key);
    if (!entry) {
      entry = { key, name, volume: 0, bestWeight: 0, bestOneRepMax: 0, dates: new Set() };
      byName.set(key, entry);
    }

    const weight = row.weight ?? 0;
    entry.volume += (row.sets ?? 0) * (row.reps ?? 0) * weight;
    entry.bestWeight = Math.max(entry.bestWeight, weight);
    entry.bestOneRepMax = Math.max(
      entry.bestOneRepMax,
      estimateOneRepMax(weight, row.reps ?? 0),
    );
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
    totals: {
      totalVolume: exercises.reduce((sum, e) => sum + e.volume, 0),
      exercises: exercises.length,
      sessions: allDates.size,
    },
  };
}

export async function getAllStatsRows() {
  if (isGuestMode()) return localGetAllExerciseRows();
  const { data, error } = await supabase
    .from("exercises")
    .select("name, weight, sets, reps, date, position")
    .order("date", { ascending: false })
    .order("position", { ascending: false });
  if (error) throw error;
  return data;
}
