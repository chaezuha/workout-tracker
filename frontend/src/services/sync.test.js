import { beforeEach, describe, expect, it, vi } from "vitest";
import { installLocalStorage } from "@/test/localStorageMock";

// The mock records pushes as "<table>.<verb>" keys in h.calls; a test can
// stage a failure per key (an Error rejects like a network failure, a plain
// object resolves as a Supabase server error).
const h = vi.hoisted(() => ({
  session: { user: { id: "u1" } },
  getSessionError: null,
  calls: [],
  results: new Map(),
  onCall: null,
  // Hydrate reads: rows per table, plus an optional gate promise the test
  // resolves to control when the in-flight selects come back.
  selectData: new Map(),
  selectGate: null,
}));

vi.mock("@/lib/supabase", () => {
  const respond = (key) => {
    h.calls.push(key);
    h.onCall?.(key);
    const result = h.results.get(key);
    if (result instanceof Error) return Promise.reject(result);
    return Promise.resolve({ data: null, error: result ?? null });
  };
  return {
    supabase: {
      auth: {
        getSession: async () => ({
          data: { session: h.session },
          error: h.getSessionError,
        }),
      },
      from: (table) => ({
        upsert: () => respond(`${table}.upsert`),
        delete: () => ({ eq: () => respond(`${table}.delete`) }),
        select: () => {
          const chain = {
            order: () => chain,
            then: (resolve, reject) => {
              h.calls.push(`${table}.select`);
              h.onCall?.(`${table}.select`);
              return (h.selectGate ?? Promise.resolve())
                .then(() => ({
                  data: h.selectData.get(table) ?? [],
                  error: null,
                }))
                .then(resolve, reject);
            },
          };
          return chain;
        },
      }),
      rpc: (name) => respond(`rpc.${name}`),
    },
  };
});

vi.mock("@/services/workouts", () => ({
  rowToSession: vi.fn(),
  rowToExercise: vi.fn(),
  pushDayToSupabase: vi.fn(async (dateKey) => {
    h.calls.push(`pushDay.${dateKey}`);
    h.onCall?.(`pushDay.${dateKey}`);
    const result = h.results.get(`pushDay.${dateKey}`);
    if (result) throw result;
  }),
}));

import { flush, hydrate } from "./sync";
import * as outbox from "./outbox";
import { cacheStore } from "./cacheStore";
import { rowToSession, rowToExercise } from "./workouts";

beforeEach(() => {
  installLocalStorage();
  h.session = { user: { id: "u1" } };
  h.getSessionError = null;
  h.calls = [];
  h.results = new Map();
  h.onCall = null;
  h.selectData = new Map();
  h.selectGate = null;
});

describe("flush", () => {
  it("does nothing when signed out, keeping ops queued", async () => {
    h.session = null;
    outbox.enqueue({ type: "checkin", dateKey: "d1", present: true });

    await flush();

    expect(h.calls).toEqual([]);
    expect(outbox.size()).toBe(1);
  });

  it("pushes ops in FIFO order and empties the queue", async () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s1", seconds: 30 });
    outbox.enqueue({ type: "checkin", dateKey: "d2", present: true });

    await flush();

    expect(h.calls).toEqual([
      "pushDay.d1",
      "rpc.add_session_duration",
      "checkins.upsert",
    ]);
    expect(outbox.size()).toBe(0);
  });

  it("stops on a network error, keeping the failed op and the remainder", async () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s1", seconds: 30 });
    outbox.enqueue({ type: "checkin", dateKey: "d2", present: true });
    h.results.set("rpc.add_session_duration", new TypeError("Failed to fetch"));

    await flush();

    expect(outbox.list().map((o) => o.type)).toEqual(["addDuration", "checkin"]);

    // Back online: the next flush completes the rest in order.
    h.results.delete("rpc.add_session_duration");
    await flush();
    expect(outbox.size()).toBe(0);
    expect(h.calls).toEqual([
      "pushDay.d1",
      "rpc.add_session_duration", // failed attempt
      "rpc.add_session_duration",
      "checkins.upsert",
    ]);
  });

  it("keeps everything when the session itself cannot be fetched", async () => {
    h.getSessionError = { message: "fetch failed" };
    outbox.enqueue({ type: "checkin", dateKey: "d1", present: true });

    await flush();

    expect(h.calls).toEqual([]);
    expect(outbox.size()).toBe(1);
  });

  it("pushes an op that is enqueued while a flush is running", async () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    h.onCall = (key) => {
      if (key === "pushDay.d1") {
        h.onCall = null;
        outbox.enqueue({ type: "checkin", dateKey: "d2", present: true });
      }
    };

    await flush();

    expect(h.calls).toEqual(["pushDay.d1", "checkins.upsert"]);
    expect(outbox.size()).toBe(0);
  });

  it("drops a poison op after repeated server errors and moves on", async () => {
    outbox.enqueue({ type: "checkin", dateKey: "d1", present: true });
    outbox.enqueue({ type: "checkin", dateKey: "d2", present: true });
    h.results.set("checkins.upsert", { code: "P0001", message: "boom" });

    for (let i = 0; i < 4; i++) {
      await flush();
      expect(outbox.size()).toBe(2); // still retrying, still queued
    }

    // Fifth server failure drops the poison op; d2 then hits the same
    // staged error and starts its own attempt count.
    await flush();
    expect(outbox.list().map((o) => o.dateKey)).toEqual(["d2"]);
  });
});

describe("hydrate", () => {
  const serverSessionRow = {
    id: "srv",
    date: "2026-07-06",
    name: "Server copy",
    position: 0,
    duration_seconds: 0,
    created_at: "2026-07-06T10:00:00.000Z",
  };
  const localDay = [
    {
      id: "loc",
      name: "Local edit",
      createdAt: "2026-07-06T11:00:00.000Z",
      exercises: [],
    },
  ];

  beforeEach(() => {
    rowToSession.mockImplementation((row) => ({
      id: row.id,
      name: row.name ?? null,
      position: row.position ?? 0,
      durationSeconds: row.duration_seconds ?? 0,
      createdAt: row.created_at,
      exercises: [],
    }));
    rowToExercise.mockImplementation((row) => ({ ...row }));
  });

  it("replaces the mirror with the server snapshot when nothing is pending", async () => {
    cacheStore.saveDay("2026-07-06", localDay); // no outbox op → not dirty
    h.selectData.set("workout_sessions", [serverSessionRow]);

    await hydrate();

    expect(cacheStore.getDayForDate("2026-07-06")[0].name).toBe("Server copy");
  });

  it("keeps the newer mirror when an edit is enqueued and flushed mid-read", async () => {
    h.selectData.set("workout_sessions", [serverSessionRow]);
    let releaseReads;
    h.selectGate = new Promise((resolve) => {
      releaseReads = resolve;
    });

    const hydrating = hydrate();

    // While the hydrate reads are in flight: edit the day, queue the op,
    // and let a flush push and complete it — the queue is clean again
    // before the (stale) reads resolve.
    cacheStore.saveDay("2026-07-06", localDay);
    outbox.enqueue({ type: "saveDay", dateKey: "2026-07-06" });
    await flush();
    expect(outbox.size()).toBe(0);

    releaseReads();
    await hydrating;

    expect(cacheStore.getDayForDate("2026-07-06")[0].name).toBe("Local edit");
  });
});
