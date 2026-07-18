import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { buildPrBaselines, detectPrs, recordResult } = await import(
  "@/services/prs"
);

const row = (overrides = {}) => ({
  name: "Bench Press",
  weight: 100,
  sets: 3,
  reps: 5,
  completedReps: [5, 5, 5],
  date: "2026-07-01",
  ...overrides,
});

describe("buildPrBaselines", () => {
  it("aggregates best weight and best e1RM per lowercased name", () => {
    const baselines = buildPrBaselines(
      [
        row({ weight: 100, completedReps: [5] }),
        row({ name: "bench press", weight: 120, completedReps: [1] }),
      ],
      "2026-07-06",
    );
    const entry = baselines.get("bench press");
    expect(entry.bestWeight).toBe(120);
    // 120x1 = 120 e1RM < 100x5 Epley (100 * (1 + 5/30)) ≈ 116.7 → 120 wins
    expect(entry.bestOneRepMax).toBe(120);
  });

  it("excludes rows on or after beforeDateKey", () => {
    const baselines = buildPrBaselines(
      [
        row({ date: "2026-07-06", weight: 200 }),
        row({ date: "2026-07-07", weight: 300 }),
        row({ date: "2026-07-05", weight: 100 }),
      ],
      "2026-07-06",
    );
    expect(baselines.get("bench press").bestWeight).toBe(100);
  });

  it("ignores preplanned rows and stale reps beyond the set count", () => {
    const baselines = buildPrBaselines(
      [
        row({ completedReps: [] }),
        // only the first 2 entries count toward e1RM (sets: 2)
        row({ sets: 2, weight: 100, completedReps: [5, 5, 20] }),
      ],
      "2026-07-06",
    );
    const entry = baselines.get("bench press");
    expect(entry.bestOneRepMax).toBeCloseTo(100 * (1 + 5 / 30));
  });

  it("scores per-set weights and never lets a warmup set a record", () => {
    const baselines = buildPrBaselines(
      [
        row({
          weight: 140,
          sets: 3,
          reps: 8,
          completedReps: [1, 8, 6],
          setEntries: [
            { weight: 225, targetReps: 1, reps: 1, type: "warmup", rpe: null },
            { weight: 140, targetReps: 8, reps: 8, type: "working", rpe: null },
            { weight: 140, targetReps: 8, reps: 6, type: "working", rpe: null },
          ],
        }),
      ],
      "2026-07-06",
    );
    const entry = baselines.get("bench press");
    expect(entry.bestWeight).toBe(140); // 225 warmup single excluded
    expect(entry.bestOneRepMax).toBeCloseTo(140 * (1 + 8 / 30));
  });
});

describe("detectPrs", () => {
  const baselines = () =>
    new Map([["bench press", { bestWeight: 100, bestOneRepMax: 116 }]]);

  it("reports a weight PR", () => {
    const prs = detectPrs(row({ weight: 105, completedReps: [1] }), baselines());
    expect(prs).toEqual([
      { type: "weight", value: 105, previous: 100 },
    ]);
  });

  it("reports an e1RM PR without a weight PR", () => {
    // 100 x 8 → Epley ≈ 126.7 > 116, weight unchanged
    const prs = detectPrs(row({ weight: 100, completedReps: [8] }), baselines());
    expect(prs).toEqual([
      { type: "oneRepMax", value: 100 * (1 + 8 / 30), previous: 116 },
    ]);
  });

  it("reports both when weight and e1RM improve", () => {
    const prs = detectPrs(row({ weight: 110, completedReps: [5] }), baselines());
    expect(prs.map((p) => p.type)).toEqual(["weight", "oneRepMax"]);
  });

  it("reports nothing when the result matches the baseline", () => {
    const prs = detectPrs(
      row({ weight: 100, completedReps: [1] }),
      new Map([["bench press", { bestWeight: 100, bestOneRepMax: 100 }]]),
    );
    expect(prs).toEqual([]);
  });

  it("never flags a first-time exercise", () => {
    expect(detectPrs(row({ name: "Squat", weight: 500 }), baselines())).toEqual(
      [],
    );
  });

  it("returns nothing without logged reps", () => {
    expect(detectPrs(row({ completedReps: [] }), baselines())).toEqual([]);
    expect(detectPrs(row({ name: "  " }), baselines())).toEqual([]);
  });
});

describe("recordResult", () => {
  it("creates entries and escalates within a session", () => {
    const baselines = new Map();
    const first = row({ weight: 100, completedReps: [5] });
    recordResult(baselines, first);
    // first-ever log created the baseline, so repeating it is not a PR...
    expect(detectPrs(first, baselines)).toEqual([]);
    // ...but beating it later in the same session is
    const heavier = row({ weight: 110, completedReps: [5] });
    expect(detectPrs(heavier, baselines).map((p) => p.type)).toEqual([
      "weight",
      "oneRepMax",
    ]);
    recordResult(baselines, heavier);
    expect(detectPrs(heavier, baselines)).toEqual([]);
  });

  it("is monotonic: folding an older, weaker result is a no-op", () => {
    const baselines = new Map();
    recordResult(baselines, row({ weight: 110, completedReps: [5] }));
    recordResult(baselines, row({ weight: 90, completedReps: [3] }));
    expect(baselines.get("bench press").bestWeight).toBe(110);
  });

  it("skips exercises without logged reps", () => {
    const baselines = new Map();
    recordResult(baselines, row({ completedReps: [] }));
    expect(baselines.size).toBe(0);
  });
});
