import { beforeEach, describe, expect, it, vi } from "vitest";
import { installLocalStorage } from "@/test/localStorageMock";

// Chainable Supabase mock: every query resolves from h. In "offline" mode
// each request fails the way postgrest reports network failures (an error
// object with an empty code).
const h = vi.hoisted(() => ({
  mode: "offline",
  sessionRows: [],
  exerciseRows: [],
  calls: [],
}));

vi.mock("@/lib/supabase", () => {
  const respond = (table) => {
    h.calls.push(table);
    if (h.mode === "offline") {
      return { data: null, error: { message: "TypeError: Failed to fetch", code: "" } };
    }
    const data =
      table === "workout_sessions" ? h.sessionRows : h.exerciseRows;
    return { data, error: null };
  };
  const chain = (table) => {
    const obj = {};
    for (const m of ["select", "eq", "order", "not", "upsert", "insert", "update", "delete", "single"]) {
      obj[m] = () => obj;
    }
    obj.then = (resolve, reject) =>
      Promise.resolve(respond(table)).then(resolve, reject);
    return obj;
  };
  return {
    supabase: {
      from: (table) => chain(table),
      auth: { getSession: async () => ({ data: { session: null }, error: null }) },
      rpc: () => Promise.resolve({ data: null, error: null }),
    },
  };
});

import { getDayForDate, saveDayForDate } from "./workouts";
import { cacheStore } from "./cacheStore";
import * as outbox from "./outbox";

const DAY = [
  {
    id: "s1",
    name: "Push",
    createdAt: "2026-07-06T10:00:00.000Z",
    exercises: [
      {
        id: "e1",
        name: "Bench Press",
        weight: 100,
        sets: 3,
        reps: 8,
        notes: "",
        completedReps: [],
      },
    ],
  },
];

beforeEach(() => {
  // Fresh storage with no guest:active flag = signed-in service branch.
  installLocalStorage();
  h.mode = "offline";
  h.sessionRows = [];
  h.exerciseRows = [];
  h.calls = [];
});

describe("saveDayForDate (signed in, offline)", () => {
  it("writes the mirror and queues a saveDay op without touching the server", async () => {
    await saveDayForDate("2026-07-06", DAY);

    const mirrored = cacheStore.getDayForDate("2026-07-06");
    expect(mirrored).toHaveLength(1);
    expect(mirrored[0].exercises[0].name).toBe("Bench Press");
    expect(outbox.list()).toEqual([
      expect.objectContaining({ type: "saveDay", dateKey: "2026-07-06" }),
    ]);
    expect(h.calls).toEqual([]);
  });
});

describe("getDayForDate (signed in)", () => {
  it("serves the mirror when the server is unreachable", async () => {
    cacheStore.saveDay("2026-07-06", DAY);

    const day = await getDayForDate("2026-07-06");

    expect(day).toHaveLength(1);
    expect(day[0].name).toBe("Push");
    expect(day[0].exercises[0].name).toBe("Bench Press");
  });

  it("serves the mirror for a dirty date even when the server has stale data", async () => {
    h.mode = "online";
    h.sessionRows = [
      {
        id: "stale",
        name: "Old session",
        position: 0,
        duration_seconds: 0,
        created_at: "2026-07-01T10:00:00.000Z",
        date: "2026-07-06",
      },
    ];

    await saveDayForDate("2026-07-06", DAY); // marks the date dirty
    const day = await getDayForDate("2026-07-06");

    expect(day[0].name).toBe("Push"); // local edit, not the server copy
    expect(h.calls).toEqual([]); // dirty reads never hit the server
  });
});
