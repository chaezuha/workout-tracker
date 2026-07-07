import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabase", () => ({ supabase: {} }));

const { summarizeSession } = await import("@/services/summary");

const session = (overrides = {}) => ({
  id: "s1",
  name: "Push Day",
  position: 0,
  durationSeconds: 3600,
  createdAt: "2026-07-06T10:00:00.000Z",
  exercises: [
    {
      id: "e1",
      name: "Bench Press",
      weight: 100,
      sets: 3,
      reps: 5,
      notes: "",
      completedReps: [5, 5, 4],
    },
    {
      id: "e2",
      name: "Overhead Press",
      weight: 60,
      sets: 3,
      reps: 8,
      notes: "",
      completedReps: [],
    },
  ],
  ...overrides,
});

describe("summarizeSession", () => {
  it("computes per-exercise and total volume from logged reps", () => {
    const summary = summarizeSession(session(), "2026-07-06");
    expect(summary.exercises).toHaveLength(1);
    expect(summary.exercises[0].volume).toBe((5 + 5 + 4) * 100);
    expect(summary.totalVolume).toBe(1400);
    expect(summary.hasLoggedReps).toBe(true);
  });

  it("excludes preplanned exercises and reports hasLoggedReps=false when empty", () => {
    const summary = summarizeSession(
      session({ exercises: [session().exercises[1]] }),
      "2026-07-06",
    );
    expect(summary.exercises).toEqual([]);
    expect(summary.hasLoggedReps).toBe(false);
    expect(summary.totalVolume).toBe(0);
  });

  it("caps logged reps at the planned set count", () => {
    const summary = summarizeSession(
      session({
        exercises: [
          { name: "Row", weight: 50, sets: 2, reps: 10, completedReps: [10, 10, 10] },
        ],
      }),
      "2026-07-06",
    );
    expect(summary.exercises[0].loggedReps).toEqual([10, 10]);
    expect(summary.totalVolume).toBe(1000);
  });

  it("falls back to 'Workout' when the session is unnamed", () => {
    expect(summarizeSession(session({ name: null }), "2026-07-06").name).toBe(
      "Workout",
    );
    expect(summarizeSession(session({ name: "  " }), "2026-07-06").name).toBe(
      "Workout",
    );
  });

  it("flags PR exercises by lowercased name", () => {
    const summary = summarizeSession(
      session(),
      "2026-07-06",
      new Set(["bench press"]),
    );
    expect(summary.exercises[0].isPr).toBe(true);
  });

  it("formats the date key as an absolute label", () => {
    const summary = summarizeSession(session(), "2026-07-06");
    expect(summary.dateLabel).toBe("Mon, Jul 6, 2026");
  });
});
