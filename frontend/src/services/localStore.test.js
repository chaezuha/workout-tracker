import { beforeEach, describe, expect, it } from "vitest";
import { GUEST_KEYS } from "@/lib/guestMode";
import { installLocalStorage } from "@/test/localStorageMock";
import {
  localGetAllSessionRows,
  localGetDayForDate,
  localHasGuestData,
} from "./localStore";

function seed(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

beforeEach(() => {
  installLocalStorage();
});

describe("localGetDayForDate", () => {
  it("returns modern sessions with their exercises attached", () => {
    seed(GUEST_KEYS.sessions, {
      "2026-06-10": [
        {
          id: "s1",
          name: "Push",
          position: 0,
          durationSeconds: 120,
          createdAt: "2026-06-10T10:00:00.000Z",
        },
      ],
    });
    seed(GUEST_KEYS.workouts, {
      "2026-06-10": [
        {
          id: "e1",
          name: "Bench Press",
          weight: 100,
          sets: 3,
          reps: 8,
          notes: "",
          completedReps: [],
          sessionId: "s1",
        },
      ],
    });

    const day = localGetDayForDate("2026-06-10");
    expect(day).toHaveLength(1);
    expect(day[0].id).toBe("s1");
    expect(day[0].name).toBe("Push");
    // sessionId is stripped from the exercises in the returned shape
    expect(day[0].exercises).toEqual([
      {
        id: "e1",
        name: "Bench Press",
        weight: 100,
        sets: 3,
        reps: 8,
        notes: "",
        completedReps: [],
      },
    ]);
  });

  it("upgrades legacy duration-only sessions with names and positions", () => {
    seed(GUEST_KEYS.sessions, {
      "2026-06-10": [
        { id: "s1", durationSeconds: 300, createdAt: "2026-06-10T10:00:00.000Z" },
        { id: "s2", durationSeconds: 60, createdAt: "2026-06-10T11:00:00.000Z" },
      ],
    });

    const day = localGetDayForDate("2026-06-10");
    expect(
      day.map((s) => ({ id: s.id, name: s.name, position: s.position })),
    ).toEqual([
      { id: "s1", name: null, position: 0 },
      { id: "s2", name: null, position: 1 },
    ]);

    // The migrated shape is written back to localStorage
    const stored = JSON.parse(localStorage.getItem(GUEST_KEYS.sessions));
    expect(stored["2026-06-10"].map((s) => s.position)).toEqual([0, 1]);
  });

  it("synthesizes a session for pre-session exercises", () => {
    seed(GUEST_KEYS.workouts, {
      "2026-06-10": [{ id: "e1", name: "Squat", weight: 200, sets: 3, reps: 5 }],
    });

    const day = localGetDayForDate("2026-06-10");
    expect(day).toHaveLength(1);
    expect(day[0].name).toBeNull();
    expect(day[0].durationSeconds).toBe(0);
    expect(day[0].exercises.map((e) => e.id)).toEqual(["e1"]);
  });

  it("reattaches exercises with dangling session ids to the first session", () => {
    seed(GUEST_KEYS.sessions, {
      "2026-06-10": [
        {
          id: "s1",
          name: "Push",
          position: 0,
          durationSeconds: 0,
          createdAt: "2026-06-10T10:00:00.000Z",
        },
      ],
    });
    seed(GUEST_KEYS.workouts, {
      "2026-06-10": [
        { id: "e1", name: "Bench Press", sets: 3, reps: 8, sessionId: "gone" },
      ],
    });

    const day = localGetDayForDate("2026-06-10");
    expect(day[0].exercises.map((e) => e.id)).toEqual(["e1"]);
  });

  it("returns an empty array for a date with no data", () => {
    expect(localGetDayForDate("2026-06-10")).toEqual([]);
  });
});

describe("localHasGuestData", () => {
  it("is false with no stored data", () => {
    expect(localHasGuestData()).toBe(false);
  });

  it("is true with any workout day", () => {
    seed(GUEST_KEYS.workouts, { "2026-06-10": [] });
    expect(localHasGuestData()).toBe(true);
  });

  it("is true with any check-in", () => {
    seed(GUEST_KEYS.checkins, ["2026-06-10"]);
    expect(localHasGuestData()).toBe(true);
  });

  it("ignores untouched sample templates", () => {
    seed(GUEST_KEYS.templates, [
      { id: "t1", name: "Push Day", isSample: true, exercises: [] },
    ]);
    expect(localHasGuestData()).toBe(false);
  });

  it("is true with a custom template", () => {
    seed(GUEST_KEYS.templates, [{ id: "t1", name: "Mine", exercises: [] }]);
    expect(localHasGuestData()).toBe(true);
  });
});

describe("localGetAllSessionRows", () => {
  it("counts workout-only dates as one zero-duration session", () => {
    seed(GUEST_KEYS.sessions, {
      "2026-06-10": [{ id: "s1", durationSeconds: 300 }],
    });
    seed(GUEST_KEYS.workouts, {
      "2026-06-09": [{ id: "e1", name: "Squat" }],
    });
    expect(localGetAllSessionRows()).toEqual([
      { date: "2026-06-10", durationSeconds: 300 },
      { date: "2026-06-09", durationSeconds: 0 },
    ]);
  });
});
