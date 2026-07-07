import { loggedReps } from "@/services/stats";
import { fromDateKey } from "@/lib/dates";

// Flattens one session into the data the share card renders. Only exercises
// with logged reps make the card (a preplanned exercise isn't a result);
// volume uses the same logged-reps × weight formula as aggregateStats.
export function summarizeSession(session, dateKey, prNames = new Set()) {
  const exercises = [];
  let totalVolume = 0;

  for (const e of session.exercises ?? []) {
    const name = (e.name ?? "").trim();
    if (!name) continue;
    const reps = loggedReps(e);
    if (!reps.length) continue;
    const weight = Number(e.weight) || 0;
    const volume = reps.reduce((sum, r) => sum + r, 0) * weight;
    totalVolume += volume;
    exercises.push({
      name,
      weight,
      loggedReps: reps,
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
