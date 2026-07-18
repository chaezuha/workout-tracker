import { describe, it, expect, beforeEach } from "vitest";
import { installLocalStorage } from "@/test/localStorageMock";
import {
  clampRpe,
  getEffortScale,
  setEffortScale,
  rpeToDisplay,
  displayToRpe,
} from "./effort";

beforeEach(() => {
  installLocalStorage();
});

describe("clampRpe", () => {
  it("snaps to 0.5 steps within 5–10", () => {
    expect(clampRpe(8.3)).toBe(8.5);
    expect(clampRpe(7.74)).toBe(7.5);
    expect(clampRpe(11)).toBe(10);
    expect(clampRpe(2)).toBe(5);
    expect(clampRpe("abc")).toBeNull();
  });
});

describe("scale preference", () => {
  it("defaults to rpe and persists rir", () => {
    expect(getEffortScale()).toBe("rpe");
    setEffortScale("rir");
    expect(getEffortScale()).toBe("rir");
    setEffortScale("bogus");
    expect(getEffortScale()).toBe("rpe");
  });
});

describe("conversion", () => {
  it("is lossless both ways (RIR = 10 − RPE)", () => {
    expect(rpeToDisplay(8.5, "rir")).toBe(1.5);
    expect(rpeToDisplay(8.5, "rpe")).toBe(8.5);
    expect(rpeToDisplay(null, "rir")).toBeNull();
    expect(displayToRpe(1.5, "rir")).toBe(8.5);
    expect(displayToRpe("2", "rir")).toBe(8);
    expect(displayToRpe("9", "rpe")).toBe(9);
    expect(displayToRpe("", "rpe")).toBeNull();
    for (let rpe = 5; rpe <= 10; rpe += 0.5) {
      expect(displayToRpe(rpeToDisplay(rpe, "rir"), "rir")).toBe(rpe);
    }
  });
});
