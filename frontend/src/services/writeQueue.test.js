import { describe, it, expect, beforeEach } from "vitest";
import { enqueueWrite, _resetWriteQueue } from "./writeQueue";

const defer = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};

describe("enqueueWrite", () => {
  beforeEach(() => {
    _resetWriteQueue();
  });

  it("runs writes in call order even when an earlier write is slow", async () => {
    const order = [];
    const slow = defer();

    const first = enqueueWrite(async () => {
      await slow.promise;
      order.push("saveDay");
    });
    const second = enqueueWrite(async () => {
      order.push("addDuration");
    });

    // The second write must not start while the first is pending.
    await Promise.resolve();
    expect(order).toEqual([]);

    slow.resolve();
    await Promise.all([first, second]);
    expect(order).toEqual(["saveDay", "addDuration"]);
  });

  it("keeps running queued writes after one rejects", async () => {
    const order = [];

    const failing = enqueueWrite(async () => {
      throw new Error("boom");
    });
    const next = enqueueWrite(async () => {
      order.push("next");
    });

    await expect(failing).rejects.toThrow("boom");
    await next;
    expect(order).toEqual(["next"]);
  });

  it("returns the write's resolved value", async () => {
    await expect(enqueueWrite(async () => 42)).resolves.toBe(42);
  });
});
