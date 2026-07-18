import { describe, it, expect } from "vitest";
import {
  buildLastResults,
  suggestProgression,
  formatSuggestion,
  formatLastEntries,
} from "./progression";

const entry = (overrides = {}) => ({
  weight: 135,
  targetReps: 8,
  reps: 8,
  type: "working",
  rpe: null,
  ...overrides,
});

// Rows in getAllStatsRows shape (legacy columns; setEntries optional).
const row = (overrides = {}) => ({
  name: "Bench Press",
  weight: 135,
  sets: 3,
  reps: 8,
  completedReps: [8, 8, 8],
  date: "2026-07-15",
  position: 0,
  ...overrides,
});

describe("buildLastResults", () => {
  it("keeps the most recent strictly-before day per name", () => {
    const results = buildLastResults(
      [
        row({ date: "2026-07-18", weight: 145 }), // viewed day — excluded
        row({ date: "2026-07-15", weight: 135 }),
        row({ date: "2026-07-10", weight: 130 }),
      ],
      "2026-07-18",
    );
    const last = results.get("bench press");
    expect(last.date).toBe("2026-07-15");
    expect(last.entries[0].weight).toBe(135);
  });

  it("skips rows with no logged sets and blank names", () => {
    const results = buildLastResults(
      [row({ completedReps: [] }), row({ name: "  " })],
      "2026-07-18",
    );
    expect(results.size).toBe(0);
  });

  it("resolves a same-day duplicate to the row with the most logged sets", () => {
    const results = buildLastResults(
      [
        row({ completedReps: [8, 0, 0], weight: 100 }),
        row({ completedReps: [8, 8, 8], weight: 120, position: 1 }),
      ],
      "2026-07-18",
    );
    expect(results.get("bench press").entries[0].weight).toBe(120);
  });

  it("matches names case-insensitively", () => {
    const results = buildLastResults([row({ name: "bench press" })], "2026-07-18");
    expect(results.get("bench press")).toBeTruthy();
  });
});

describe("suggestProgression", () => {
  it("adds weight when every working set hits its target", () => {
    const s = suggestProgression({
      date: "2026-07-15",
      entries: [entry(), entry(), entry({ reps: 9 })],
    });
    expect(s).toEqual({ kind: "increase", weight: 140, targetReps: 8 });
    expect(formatSuggestion(s)).toBe("Try 140 × 8");
  });

  it("repeats the plan after missed reps", () => {
    const s = suggestProgression({
      date: "2026-07-15",
      entries: [entry(), entry(), entry({ reps: 7 })],
    });
    expect(s).toEqual({ kind: "repeat", weight: 135, targetReps: 8 });
    expect(formatSuggestion(s)).toBe("Try to hit 135 × 8 on every set");
  });

  it("ignores warmups when judging the working sets", () => {
    const s = suggestProgression({
      date: "2026-07-15",
      entries: [entry({ weight: 95, type: "warmup", reps: 8 }), entry(), entry()],
    });
    expect(s.kind).toBe("increase");
  });

  it("returns null for mixed working weights, bodyweight, and empty history", () => {
    expect(
      suggestProgression({
        date: "2026-07-15",
        entries: [entry({ weight: 135 }), entry({ weight: 140 })],
      }),
    ).toBeNull();
    expect(
      suggestProgression({ date: "2026-07-15", entries: [entry({ weight: null })] }),
    ).toBeNull();
    expect(suggestProgression(null)).toBeNull();
    expect(
      suggestProgression({
        date: "2026-07-15",
        entries: [entry({ type: "warmup" })],
      }),
    ).toBeNull();
  });

  it("respects a custom increment", () => {
    const s = suggestProgression(
      { date: "2026-07-15", entries: [entry()] },
      { increment: 2.5 },
    );
    expect(s.weight).toBe(137.5);
  });
});

describe("formatLastEntries", () => {
  it("formats a uniform-weight day compactly", () => {
    expect(
      formatLastEntries([entry(), entry(), entry({ reps: 7 })]),
    ).toBe("135 × 8/8/7");
    expect(formatLastEntries([entry({ weight: null, reps: 10 })])).toBe(
      "BW × 10",
    );
  });

  it("falls back to the per-set summary for mixed days and skips unlogged", () => {
    expect(
      formatLastEntries([
        entry({ weight: 95, type: "warmup" }),
        entry(),
        entry({ reps: null }),
      ]),
    ).toBe("95×8 (W), 135×8");
    expect(formatLastEntries([entry({ reps: null })])).toBeNull();
  });
});
