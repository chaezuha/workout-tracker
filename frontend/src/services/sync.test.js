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

import { flush } from "./sync";
import * as outbox from "./outbox";

beforeEach(() => {
  installLocalStorage();
  h.session = { user: { id: "u1" } };
  h.getSessionError = null;
  h.calls = [];
  h.results = new Map();
  h.onCall = null;
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
