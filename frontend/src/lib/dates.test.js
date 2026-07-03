import { afterEach, describe, expect, it, vi } from "vitest";
import { addDays, formatFriendly, fromDateKey, toDateKey } from "./dates";

describe("toDateKey / fromDateKey", () => {
  it("zero-pads month and day", () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  it("round-trips through fromDateKey in local time", () => {
    const date = fromDateKey("2026-07-03");
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(6);
    expect(date.getDate()).toBe(3);
    expect(toDateKey(date)).toBe("2026-07-03");
  });
});

describe("addDays", () => {
  it("rolls over month boundaries", () => {
    expect(toDateKey(addDays(new Date(2026, 0, 31), 1))).toBe("2026-02-01");
  });

  it("rolls over year boundaries", () => {
    expect(toDateKey(addDays(new Date(2025, 11, 31), 1))).toBe("2026-01-01");
  });

  it("goes backwards across months", () => {
    expect(toDateKey(addDays(new Date(2026, 2, 1), -1))).toBe("2026-02-28");
  });

  it("does not mutate the input date", () => {
    const date = new Date(2026, 0, 15);
    addDays(date, 5);
    expect(toDateKey(date)).toBe("2026-01-15");
  });
});

describe("formatFriendly", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("labels today, yesterday, and tomorrow relative to the current date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3));
    expect(formatFriendly(new Date(2026, 6, 3))).toBe("Today");
    expect(formatFriendly(new Date(2026, 6, 2))).toBe("Yesterday");
    expect(formatFriendly(new Date(2026, 6, 4))).toBe("Tomorrow");
  });

  it("falls back to a short weekday format for other dates", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 6, 3));
    expect(formatFriendly(new Date(2026, 6, 10))).toBe("Fri, Jul 10");
  });
});
