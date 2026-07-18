// "Last time" lookup and the v1 progression rule. Pure functions over
// getAllStatsRows() output (already sorted date desc / position desc).
//
// v1 policy — deliberately simple and deterministic (one prefillable answer):
//   - uniform-weight working sets, every set hit its target → add `increment`
//     and keep the target ("Try 140 × 8")
//   - any missed reps → repeat the same plan ("hit 135 × 8 on every set")
//   - mixed/pyramid working weights or bodyweight → no automated suggestion;
//     the UI still shows "Last:" and Prefill copies the previous plan.
// RPE is recorded but deliberately does not influence v1 suggestions.

import { normalizeExercise, summarizeEntries } from "@/services/setEntries";

const loggedOf = (entries) => entries.filter((en) => en.reps != null);

// Map<lowercased name, { date, entries }> — the most recent strictly-before
// day with at least one logged set. If a name appears twice on that date
// (two sessions), the row with the most logged sets wins; ties keep the
// first row under the incoming (date desc, position desc) sort.
export function buildLastResults(rows, beforeDateKey) {
  const results = new Map();
  for (const row of rows) {
    if (beforeDateKey && row.date >= beforeDateKey) continue;
    const name = (row.name ?? "").trim();
    if (!name) continue;
    const entries = normalizeExercise(row).setEntries;
    const logged = loggedOf(entries);
    if (!logged.length) continue;
    const key = name.toLowerCase();
    const existing = results.get(key);
    if (!existing) {
      results.set(key, { date: row.date, entries });
    } else if (
      existing.date === row.date &&
      logged.length > loggedOf(existing.entries).length
    ) {
      results.set(key, { date: row.date, entries });
    }
  }
  return results;
}

export function suggestProgression(lastResult, { increment = 5 } = {}) {
  if (!lastResult) return null;
  const working = loggedOf(lastResult.entries).filter(
    (en) => en.type === "working",
  );
  if (!working.length) return null;
  const weight = working[0].weight;
  if (weight == null) return null;
  if (working.some((en) => en.weight !== weight)) return null;

  const targetReps = working[0].targetReps;
  const allHit = working.every((en) => en.reps >= en.targetReps);
  if (allHit) {
    return { kind: "increase", weight: weight + increment, targetReps };
  }
  return { kind: "repeat", weight, targetReps };
}

export function formatSuggestion(suggestion) {
  if (!suggestion) return null;
  if (suggestion.kind === "increase") {
    return `Try ${suggestion.weight} × ${suggestion.targetReps}`;
  }
  return `Try to hit ${suggestion.weight} × ${suggestion.targetReps} on every set`;
}

// "135 × 8/8/7" for a uniform-weight day; falls back to the mixed per-set
// summary ("95×8 (W), 135×8") otherwise.
export function formatLastEntries(entries) {
  const logged = loggedOf(entries);
  if (!logged.length) return null;
  const weight = logged[0].weight;
  if (
    logged.every((en) => en.weight === weight && en.type === "working")
  ) {
    const reps = logged.map((en) => en.reps).join("/");
    return `${weight == null ? "BW" : weight} × ${reps}`;
  }
  return summarizeEntries(logged);
}
