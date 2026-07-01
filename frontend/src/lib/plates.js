// target: pounds to load beyond the bar; plates always load in pairs.
// Returns { counts, achieved, exact } — counts maps plate weight → total plate
// count (even numbers), achieved is the closest loadable weight on the chosen
// side of target ("up" = smallest achievable ≥ target, "down" = largest ≤ target).
export function calculatePlateBreakdown(target, availablePlates, mode = "up") {
  const counts = {};
  if (target <= 0 || availablePlates.length === 0) {
    return { counts, achieved: 0, exact: target === 0 };
  }

  // Work in 0.5 lb units so every pair increment is an integer:
  // a pair of w-lb plates adds 2w lb = 4w units.
  // Heaviest first so ties in the min-plates DP resolve to bigger plates.
  const increments = availablePlates
    .map((w) => ({ weight: w, units: w * 4 }))
    .sort((a, b) => b.units - a.units);
  const maxIncrement = Math.max(...increments.map((p) => p.units));
  const upperUnits = Math.ceil(target * 2);
  const lowerUnits = Math.floor(target * 2);
  const limit = upperUnits + maxIncrement;

  // Min-plates DP: pairs[u] = fewest pairs summing to u (Infinity if
  // unreachable), parent[u] = the pair used in that solution, for reconstruction.
  const parent = new Array(limit + 1).fill(null);
  const pairs = new Array(limit + 1).fill(Infinity);
  pairs[0] = 0;
  for (let u = 1; u <= limit; u++) {
    for (const p of increments) {
      if (p.units <= u && pairs[u - p.units] + 1 < pairs[u]) {
        pairs[u] = pairs[u - p.units] + 1;
        parent[u] = p;
      }
    }
  }

  let achievedUnits = 0;
  if (mode === "down") {
    for (let u = Math.min(lowerUnits, limit); u >= 0; u--) {
      if (pairs[u] < Infinity) {
        achievedUnits = u;
        break;
      }
    }
  } else {
    for (let u = upperUnits; u <= limit; u++) {
      if (pairs[u] < Infinity) {
        achievedUnits = u;
        break;
      }
    }
  }

  for (let u = achievedUnits; u > 0; u -= parent[u].units) {
    counts[parent[u].weight] = (counts[parent[u].weight] ?? 0) + 2;
  }

  const achieved = achievedUnits / 2;
  return { counts, achieved, exact: achieved === target };
}
