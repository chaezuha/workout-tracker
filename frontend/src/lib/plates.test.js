import { describe, expect, it } from "vitest";
import { calculatePlateBreakdown } from "./plates";

const GYM = [45, 25, 10, 5, 2.5];

describe("calculatePlateBreakdown", () => {
  it("hits an exactly loadable target", () => {
    expect(calculatePlateBreakdown(90, GYM)).toEqual({
      counts: { 45: 2 },
      achieved: 90,
      exact: true,
    });
  });

  it("uses the fewest plates for an exact target", () => {
    // 50 could be 5+10+10 per side, but a single 25 per side wins
    expect(calculatePlateBreakdown(50, GYM).counts).toEqual({ 25: 2 });
  });

  it("rounds up to the next loadable weight in up mode", () => {
    expect(calculatePlateBreakdown(47, GYM, "up")).toEqual({
      counts: { 25: 2 },
      achieved: 50,
      exact: false,
    });
  });

  it("rounds down to the previous loadable weight in down mode", () => {
    expect(calculatePlateBreakdown(47, GYM, "down")).toEqual({
      counts: { 10: 4, 2.5: 2 },
      achieved: 45,
      exact: false,
    });
  });

  it("returns an empty bar when down mode can't reach the target", () => {
    expect(calculatePlateBreakdown(4, [45], "down")).toEqual({
      counts: {},
      achieved: 0,
      exact: false,
    });
  });

  it("treats zero and negative targets as an empty bar", () => {
    expect(calculatePlateBreakdown(0, GYM)).toEqual({
      counts: {},
      achieved: 0,
      exact: true,
    });
    expect(calculatePlateBreakdown(-10, GYM)).toEqual({
      counts: {},
      achieved: 0,
      exact: false,
    });
  });

  it("handles an empty plate inventory", () => {
    expect(calculatePlateBreakdown(45, [])).toEqual({
      counts: {},
      achieved: 0,
      exact: false,
    });
  });

  it("resolves plate-count ties to the bigger plates", () => {
    // 35 per side is 25+10 or 20+15 — both two pairs, bigger plate wins
    expect(calculatePlateBreakdown(70, [25, 20, 15, 10]).counts).toEqual({
      25: 2,
      10: 2,
    });
  });

  it("supports fractional plates via the half-pound unit encoding", () => {
    expect(calculatePlateBreakdown(2.5, [2.5, 1.25])).toEqual({
      counts: { 1.25: 2 },
      achieved: 2.5,
      exact: true,
    });
  });

  it("always returns even plate counts, since plates load in pairs", () => {
    const { counts } = calculatePlateBreakdown(137.5, GYM);
    expect(Object.keys(counts).length).toBeGreaterThan(0);
    for (const count of Object.values(counts)) {
      expect(count % 2).toBe(0);
    }
  });
});
