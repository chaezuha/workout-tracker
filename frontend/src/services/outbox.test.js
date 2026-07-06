import { beforeEach, describe, expect, it } from "vitest";
import { installLocalStorage } from "@/test/localStorageMock";
import { OUTBOX_KEY } from "@/lib/syncKeys";
import * as outbox from "./outbox";

beforeEach(() => {
  installLocalStorage();
});

describe("enqueue", () => {
  it("persists ops to localStorage so they survive a reload", () => {
    outbox.enqueue({ type: "saveDay", dateKey: "2026-07-06" });
    const stored = JSON.parse(localStorage.getItem(OUTBOX_KEY));
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({ type: "saveDay", dateKey: "2026-07-06" });
  });

  it("coalesces saveDay per date, keeping the original queue position", () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    outbox.enqueue({ type: "checkin", dateKey: "d1", present: true });
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });

    const ops = outbox.list();
    expect(ops.map((o) => o.type)).toEqual(["saveDay", "checkin"]);
    expect(ops[0].rev).toBe(1);
  });

  it("keeps saveDay ops for different dates separate", () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    outbox.enqueue({ type: "saveDay", dateKey: "d2" });
    expect(outbox.list()).toHaveLength(2);
  });

  it("sums addDuration seconds per session", () => {
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s1", seconds: 30 });
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s1", seconds: 45 });
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s2", seconds: 10 });

    const ops = outbox.list();
    expect(ops).toHaveLength(2);
    expect(ops[0].seconds).toBe(75);
    expect(ops[1].seconds).toBe(10);
  });

  it("keeps the last checkin state per date", () => {
    outbox.enqueue({ type: "checkin", dateKey: "d1", present: true });
    outbox.enqueue({ type: "checkin", dateKey: "d1", present: false });

    const ops = outbox.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].present).toBe(false);
  });

  it("lets templateDelete supersede a pending templateSave", () => {
    outbox.enqueue({ type: "templateSave", templateId: "t1" });
    outbox.enqueue({ type: "templateDelete", templateId: "t1" });

    const ops = outbox.list();
    expect(ops).toHaveLength(1);
    expect(ops[0].type).toBe("templateDelete");
  });
});

describe("complete", () => {
  it("removes an op whose pushed rev is current", () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    const [op] = outbox.list();
    outbox.complete(op.id, { rev: op.rev });
    expect(outbox.size()).toBe(0);
  });

  it("keeps an op that was coalesced into while its push was in flight", () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    const [op] = outbox.list(); // flush snapshots rev 0 here
    outbox.enqueue({ type: "saveDay", dateKey: "d1" }); // edit lands mid-push

    outbox.complete(op.id, { rev: op.rev });
    expect(outbox.size()).toBe(1); // the newer edit still needs a push

    outbox.complete(op.id, { rev: outbox.list()[0].rev });
    expect(outbox.size()).toBe(0);
  });

  it("keeps duration seconds added while the push was in flight", () => {
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s1", seconds: 30 });
    const [op] = outbox.list(); // flush snapshots 30s here
    outbox.enqueue({ type: "addDuration", dateKey: "d1", sessionId: "s1", seconds: 20 });

    outbox.complete(op.id, { seconds: 30 });
    expect(outbox.list()[0].seconds).toBe(20); // remainder stays queued

    outbox.complete(op.id, { seconds: 20 });
    expect(outbox.size()).toBe(0);
  });
});

describe("dirtyDates", () => {
  it("collects dates from saveDay and addDuration ops", () => {
    outbox.enqueue({ type: "saveDay", dateKey: "d1" });
    outbox.enqueue({ type: "addDuration", dateKey: "d2", sessionId: "s1", seconds: 5 });
    outbox.enqueue({ type: "checkin", dateKey: "d3", present: true });

    expect(outbox.dirtyDates()).toEqual(new Set(["d1", "d2"]));
  });
});
