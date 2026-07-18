import { loggedSets } from "@/services/stats";
import { summarizeEntries } from "@/services/setEntries";
import { fromDateKey } from "@/lib/dates";

// Flattens one session into the data the share card renders. Only exercises
// with logged sets make the card (a preplanned exercise isn't a result);
// volume uses the same per-set reps × weight formula as aggregateStats.
export function summarizeSession(session, dateKey, prNames = new Set()) {
  const exercises = [];
  let totalVolume = 0;

  for (const e of session.exercises ?? []) {
    const name = (e.name ?? "").trim();
    if (!name) continue;
    const sets = loggedSets(e);
    if (!sets.length) continue;
    const volume = sets.reduce((sum, en) => sum + en.reps * (en.weight ?? 0), 0);
    totalVolume += volume;
    exercises.push({
      name,
      // Heaviest logged set for the single-number display; setSummary spells
      // out mixed weights/types per set.
      weight: Math.max(...sets.map((en) => en.weight ?? 0)),
      loggedReps: sets.map((en) => en.reps),
      setSummary: summarizeEntries(sets),
      volume,
      isPr: prNames.has(name.toLowerCase()),
    });
  }

  return {
    dateLabel: fromDateKey(dateKey).toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    name: session.name?.trim() || "Workout",
    durationSeconds: session.durationSeconds ?? 0,
    totalVolume,
    exercises,
    hasLoggedReps: exercises.length > 0,
  };
}
