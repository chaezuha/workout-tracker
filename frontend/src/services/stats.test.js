import { afterEach, describe, expect, it, vi } from "vitest";
import {
  aggregateSessionTotals,
  aggregateStats,
  estimateOneRepMax,
  filterRowsByRange,
  loggedReps,
  rangeStartKey,
} from "./stats";

// stats.js pulls in the Supabase client at module top; mock it so the tests
// need neither env vars nor a network connection. (vi.mock is hoisted above
// the imports, so the real client is never created.)
vi.mock("@/lib/supabase", () => ({ supabase: {} }));

describe("estimateOneRepMax", () => {
  it("returns the weight itself for a single rep", () => {
    expect(estimateOneRepMax(100, 1)).toBe(100);
  });

  it("applies the Epley formula for multiple reps", () => {
    expect(estimateOneRepMax(100, 10)).toBeCloseTo(133.33, 2);
  });
});

describe("rangeStartKey", () => {
  const now = new Date(2026, 5, 15); // June 15, 2026

  it.each([
    ["today", "2026-06-15"],
    ["7d", "2026-06-09"],
    ["30d", "2026-05-17"],
    ["6m", "2025-12-15"],
    ["1y", "2025-06-15"],
  ])("returns the inclusive start of the %s range", (range, key) => {
    expect(rangeStartKey(range, now)).toBe(key);
  });

  it("returns null for all time", () => {
    expect(rangeStartKey("all", now)).toBeNull();
  });
});

describe("filterRowsByRange", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps rows on or after the range start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    const rows = [
      { date: "2026-06-15" },
      { date: "2026-06-09" },
      { date: "2026-06-08" },
    ];
    expect(filterRowsByRange(rows, "7d")).toEqual([
      { date: "2026-06-15" },
      { date: "2026-06-09" },
    ]);
  });

  it("returns all rows unfiltered for the all-time range", () => {
    const rows = [{ date: "1999-01-01" }];
    expect(filterRowsByRange(rows, "all")).toBe(rows);
  });

  it("excludes future-dated rows from bounded ranges", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15));
    const rows = [
      { date: "2026-06-15" },
      { date: "2026-06-20" }, // mistakenly logged in the future
      { date: "2026-06-14" },
    ];
    expect(filterRowsByRange(rows, "today")).toEqual([{ date: "2026-06-15" }]);
    expect(filterRowsByRange(rows, "7d")).toEqual([
      { date: "2026-06-15" },
      { date: "2026-06-14" },
    ]);
    expect(filterRowsByRange(rows, "all")).toBe(rows);
  });
});

describe("loggedReps", () => {
  it("drops stale logs beyond the planned set count", () => {
    expect(loggedReps({ sets: "2", completedReps: ["8", "7", "6"] })).toEqual([
      8, 7,
    ]);
  });

  it("filters out empty, non-numeric, and non-positive entries", () => {
    expect(
      loggedReps({ sets: 5, completedReps: ["8", "", "abc", "0", "-1"] }),
    ).toEqual([8]);
  });

  it("skips the cap when the set count is not a positive number", () => {
    expect(loggedReps({ sets: "abc", completedReps: ["5", "4"] })).toEqual([
      5, 4,
    ]);
  });

  it("handles rows with no logged reps", () => {
    expect(loggedReps({ sets: 3 })).toEqual([]);
  });
});

describe("aggregateStats", () => {
  it("aggregates volume, bests, and dates per exercise", () => {
    // Rows arrive sorted date desc, so the latest casing is seen first
    const rows = [
      { name: "Bench Press", weight: 100, sets: 2, completedReps: [8, 8], date: "2026-06-10", sessionId: "s1" },
      { name: "bench press", weight: 90, sets: 1, completedReps: [10], date: "2026-06-08", sessionId: "s2" },
    ];
    const { exercises, totals, trainedDates, trainedSessionIds } =
      aggregateStats(rows);

    expect(exercises).toHaveLength(1);
    const bench = exercises[0];
    expect(bench.name).toBe("Bench Press");
    expect(bench.volume).toBe(16 * 100 + 10 * 90);
    expect(bench.bestWeight).toBe(100);
    expect(bench.bestOneRepMax).toBeCloseTo(estimateOneRepMax(100, 8), 5);
    expect(bench.days).toBe(2);
    expect(bench.dateKeys).toEqual(["2026-06-08", "2026-06-10"]);
    expect(totals).toEqual({ totalVolume: 2500, exercises: 1, sessions: 2 });
    expect([...trainedDates].sort()).toEqual(["2026-06-08", "2026-06-10"]);
    expect([...trainedSessionIds].sort()).toEqual(["s1", "s2"]);
  });

  it("excludes preplanned rows and blank names", () => {
    const rows = [
      { name: "Squat", weight: 200, sets: 3, completedReps: [], date: "2026-06-10" },
      { name: "   ", weight: 50, sets: 1, completedReps: [5], date: "2026-06-10" },
    ];
    const { exercises, totals } = aggregateStats(rows);
    expect(exercises).toEqual([]);
    expect(totals).toEqual({ totalVolume: 0, exercises: 0, sessions: 0 });
  });

  it("treats missing weight as zero and sorts exercises by volume", () => {
    const rows = [
      { name: "Pull Up", weight: null, sets: 1, completedReps: [10], date: "2026-06-10" },
      { name: "Squat", weight: 200, sets: 1, completedReps: [5], date: "2026-06-10" },
    ];
    const { exercises } = aggregateStats(rows);
    expect(exercises.map((e) => e.name)).toEqual(["Squat", "Pull Up"]);
    expect(exercises[1].volume).toBe(0);
  });
});

describe("aggregateSessionTotals", () => {
  it("counts sessions with a duration or logged exercises of their own", () => {
    const rows = [
      { id: "a", date: "2026-06-10", durationSeconds: 60 },
      { id: "b", date: "2026-06-09", durationSeconds: 0 },
      { id: "c", date: "2026-06-08", durationSeconds: 0 },
    ];
    expect(
      aggregateSessionTotals(rows, { trainedSessionIds: new Set(["b"]) }),
    ).toEqual({ count: 2, totalSeconds: 60 });
  });

  it("does not count an untrained zero-duration session on a trained date", () => {
    const rows = [
      { id: "trained", date: "2026-06-09", durationSeconds: 0 },
      { id: "empty", date: "2026-06-09", durationSeconds: 0 },
    ];
    expect(
      aggregateSessionTotals(rows, {
        trainedSessionIds: new Set(["trained"]),
        trainedDates: new Set(["2026-06-09"]),
      }),
    ).toEqual({ count: 1, totalSeconds: 0 });
  });

  it("falls back to the date-wide check for id-less pre-migration rows", () => {
    const rows = [{ id: null, date: "2026-06-09", durationSeconds: 0 }];
    expect(
      aggregateSessionTotals(rows, { trainedDates: new Set(["2026-06-09"]) }),
    ).toEqual({ count: 1, totalSeconds: 0 });
  });

  it("handles missing durations", () => {
    expect(aggregateSessionTotals([{ id: "a", date: "2026-06-10" }])).toEqual({
      count: 0,
      totalSeconds: 0,
    });
  });
});
