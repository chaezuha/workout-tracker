import { supabase } from "@/lib/supabase";

export function estimateOneRepMax(weight, reps) {
  if (reps === 1) return weight;
  return weight * (1 + reps / 30);
}

export async function getExerciseStats() {
  const { data, error } = await supabase
    .from("exercises")
    .select("name, weight, sets, reps, date");
  if (error) throw error;

  const byName = new Map();
  const allDates = new Set();

  for (const row of data) {
    const name = row.name.trim();
    if (!name) continue;
    allDates.add(row.date);

    let entry = byName.get(name);
    if (!entry) {
      entry = { name, volume: 0, bestWeight: 0, bestOneRepMax: 0, dates: new Set() };
      byName.set(name, entry);
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
    .map(({ dates, ...rest }) => ({ ...rest, days: dates.size }))
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
