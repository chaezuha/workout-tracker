import { estimateOneRepMax, loggedSets } from "@/services/stats";

// "New PR this session" detection. Baselines are a mutable
// Map<lowercased name, { bestWeight, bestOneRepMax }> that callers keep
// folding results into (recordResult), so a PR beaten twice in one session
// celebrates twice instead of repeating the first toast.

// Warm-up sets never set records; working and drop sets do. Legacy rows
// normalize to all-working entries, so their bests are unchanged.
function currentBests(exercise) {
  const name = (exercise.name ?? "").trim();
  if (!name) return null;
  const sets = loggedSets(exercise).filter((en) => en.type !== "warmup");
  if (!sets.length) return null;
  return {
    key: name.toLowerCase(),
    weight: Math.max(...sets.map((en) => en.weight ?? 0)),
    oneRepMax: Math.max(
      ...sets.map((en) => estimateOneRepMax(en.weight ?? 0, en.reps)),
    ),
  };
}

// Folds an exercise's logged result into the baselines (creating the entry if
// new). Monotonic, so re-folding older results is a harmless no-op.
export function recordResult(baselines, exercise) {
  const bests = currentBests(exercise);
  if (!bests) return;
  let entry = baselines.get(bests.key);
  if (!entry) {
    entry = { bestWeight: 0, bestOneRepMax: 0 };
    baselines.set(bests.key, entry);
  }
  entry.bestWeight = Math.max(entry.bestWeight, bests.weight);
  entry.bestOneRepMax = Math.max(entry.bestOneRepMax, bests.oneRepMax);
}

// rows: getAllStatsRows() output. Rows on/after beforeDateKey are excluded
// ("YYYY-MM-DD" keys compare lexically) so the baseline is strictly
// historical; the caller folds in today's already-logged state separately.
export function buildPrBaselines(rows, beforeDateKey) {
  const baselines = new Map();
  for (const row of rows) {
    if (beforeDateKey && row.date >= beforeDateKey) continue;
    recordResult(baselines, row);
  }
  return baselines;
}

// An exercise with no baseline entry is being logged for the first time;
// that's not a PR, just a starting point.
export function detectPrs(exercise, baselines) {
  const bests = currentBests(exercise);
  if (!bests) return [];
  const baseline = baselines.get(bests.key);
  if (!baseline) return [];

  const prs = [];
  if (bests.weight > baseline.bestWeight) {
    prs.push({
      type: "weight",
      value: bests.weight,
      previous: baseline.bestWeight,
    });
  }
  if (bests.oneRepMax > baseline.bestOneRepMax) {
    prs.push({
      type: "oneRepMax",
      value: bests.oneRepMax,
      previous: baseline.bestOneRepMax,
    });
  }
  return prs;
}
