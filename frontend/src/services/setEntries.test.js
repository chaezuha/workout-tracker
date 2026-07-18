import { describe, it, expect } from "vitest";
import {
  sanitizeEntry,
  makeEntries,
  normalizeExercise,
  deriveLegacyFields,
  parseSetEntriesJson,
  summarizeEntries,
} from "./setEntries";

const entry = (overrides = {}) => ({
  weight: 135,
  targetReps: 8,
  reps: null,
  type: "working",
  rpe: null,
  ...overrides,
});

describe("sanitizeEntry", () => {
  it("coerces form strings and legacy empty weights", () => {
    expect(sanitizeEntry({ weight: "135", targetReps: "8", reps: "6" })).toEqual(
      entry({ reps: 6 }),
    );
    expect(sanitizeEntry({ weight: "" }).weight).toBeNull();
    expect(sanitizeEntry({ weight: -5 }).weight).toBeNull();
  });

  it("defaults invalid type to working and clamps rpe to 5–10 in 0.5 steps", () => {
    expect(sanitizeEntry({ type: "superset" }).type).toBe("working");
    expect(sanitizeEntry({ type: "drop" }).type).toBe("drop");
    expect(sanitizeEntry({ rpe: 8.3 }).rpe).toBe(8.5);
    expect(sanitizeEntry({ rpe: 12 }).rpe).toBe(10);
    expect(sanitizeEntry({ rpe: 1 }).rpe).toBe(5);
    expect(sanitizeEntry({ rpe: "" }).rpe).toBeNull();
  });

  it("treats 0 or invalid reps as not logged", () => {
    expect(sanitizeEntry({ reps: 0 }).reps).toBeNull();
    expect(sanitizeEntry({ reps: "abc" }).reps).toBeNull();
    expect(sanitizeEntry({ targetReps: 0 }).targetReps).toBe(1);
  });
});

describe("normalizeExercise — legacy synthesis", () => {
  it("synthesizes entries from weight/sets/reps/completedReps", () => {
    const e = normalizeExercise({
      name: "Bench",
      weight: "135",
      sets: "3",
      reps: "8",
      completedReps: ["8", "7"],
    });
    expect(e.setEntries).toEqual([
      entry({ reps: 8 }),
      entry({ reps: 7 }),
      entry(),
    ]);
    // legacy fields are left untouched on the synthesized branch
    expect(e.weight).toBe("135");
  });

  it("caps stale completedReps at the planned set count (loggedReps parity)", () => {
    const e = normalizeExercise({
      weight: 100,
      sets: 2,
      reps: 5,
      completedReps: [5, 5, 5, 5],
    });
    expect(e.setEntries).toHaveLength(2);
    expect(e.setEntries.every((en) => en.reps === 5)).toBe(true);
  });

  it("keeps an empty setEntries array as canonical", () => {
    const e = normalizeExercise({ weight: 100, sets: 3, reps: 8, setEntries: [] });
    // sets=3 disagrees with 0 entries → the staleness guard resynthesizes;
    // only a row whose legacy fields agree keeps [].
    expect(e.setEntries).toHaveLength(3);
    const agreed = normalizeExercise({
      weight: null,
      sets: 0,
      reps: 0,
      completedReps: [],
      setEntries: [],
    });
    expect(agreed.setEntries).toEqual([]);
  });
});

describe("normalizeExercise — staleness guard", () => {
  const canonical = {
    name: "Bench",
    weight: 140,
    sets: 3,
    reps: 8,
    completedReps: [8, 8, 6],
    setEntries: [
      entry({ weight: 95, type: "warmup", reps: 8 }),
      entry({ weight: 140, reps: 8 }),
      entry({ weight: 140, reps: 6 }),
    ],
  };

  it("keeps setEntries when the legacy columns agree", () => {
    const e = normalizeExercise(canonical);
    expect(e.setEntries).toEqual(canonical.setEntries);
  });

  it("drops setEntries when a legacy client edited reps", () => {
    const e = normalizeExercise({ ...canonical, completedReps: [8, 8, 8] });
    expect(e.setEntries.every((en) => en.type === "working")).toBe(true);
    expect(e.setEntries.map((en) => en.reps)).toEqual([8, 8, 8]);
    expect(e.setEntries.every((en) => en.weight === 140)).toBe(true);
  });

  it("drops setEntries when a legacy client edited weight or sets", () => {
    expect(
      normalizeExercise({ ...canonical, weight: 150 }).setEntries.every(
        (en) => en.weight === 150,
      ),
    ).toBe(true);
    expect(
      normalizeExercise({ ...canonical, sets: 4 }).setEntries,
    ).toHaveLength(4);
  });
});

describe("deriveLegacyFields", () => {
  it("derives weight from working/drop sets only", () => {
    const fields = deriveLegacyFields([
      entry({ weight: 225, type: "warmup" }),
      entry({ weight: 135, reps: 8 }),
      entry({ weight: 115, type: "drop", reps: 10 }),
    ]);
    expect(fields.weight).toBe(135);
    expect(fields.sets).toBe(3);
    expect(fields.completedReps).toEqual([0, 8, 10]);
  });

  it("falls back to any set's weight when only warmups exist", () => {
    expect(
      deriveLegacyFields([entry({ weight: 95, type: "warmup" })]).weight,
    ).toBe(95);
  });

  it("picks the modal targetReps with ties going to the earliest working set", () => {
    expect(
      deriveLegacyFields([
        entry({ targetReps: 5 }),
        entry({ targetReps: 8 }),
        entry({ targetReps: 8 }),
      ]).reps,
    ).toBe(8);
    expect(
      deriveLegacyFields([entry({ targetReps: 5 }), entry({ targetReps: 8 })]).reps,
    ).toBe(5);
    // warmup targets don't vote when working sets exist
    expect(
      deriveLegacyFields([
        entry({ targetReps: 10, type: "warmup" }),
        entry({ targetReps: 10, type: "warmup" }),
        entry({ targetReps: 5 }),
      ]).reps,
    ).toBe(5);
  });

  it("round-trips: normalize(legacy) → derive returns the same numbers", () => {
    const legacy = { weight: "135", sets: "3", reps: "8", completedReps: ["8", "7"] };
    const fields = deriveLegacyFields(normalizeExercise(legacy).setEntries);
    expect(fields).toEqual({
      weight: 135,
      sets: 3,
      reps: 8,
      completedReps: [8, 7, 0],
    });
    // and normalizing the dual-written row keeps the entries (guard agrees)
    const roundTripped = normalizeExercise({
      ...fields,
      setEntries: normalizeExercise(legacy).setEntries,
    });
    expect(roundTripped.setEntries).toEqual(normalizeExercise(legacy).setEntries);
  });
});

describe("parseSetEntriesJson", () => {
  it("parses and sanitizes a valid array", () => {
    const entries = parseSetEntriesJson(
      '[{"weight":95,"targetReps":8,"reps":8,"type":"warmup","rpe":7.2}]',
    );
    expect(entries).toEqual([
      entry({ weight: 95, reps: 8, type: "warmup", rpe: 7 }),
    ]);
  });

  it("throws on malformed JSON and non-arrays", () => {
    expect(() => parseSetEntriesJson("{oops")).toThrow(/not valid JSON/);
    expect(() => parseSetEntriesJson('{"weight":1}')).toThrow(/array/);
    expect(() => parseSetEntriesJson("[1,2]")).toThrow(/array/);
  });
});

describe("summarizeEntries", () => {
  it("reads like the legacy summary for a uniform unlogged plan", () => {
    expect(summarizeEntries(makeEntries(3, { weight: 135, targetReps: 8 }))).toBe(
      "135 lb · 3 sets × 8 reps",
    );
  });

  it("shows per-set reps once logging starts", () => {
    expect(
      summarizeEntries([
        entry({ reps: 8 }),
        entry({ reps: 8 }),
        entry({ reps: 7 }),
      ]),
    ).toBe("135 lb × 8/8/7");
    expect(
      summarizeEntries([entry({ reps: 8 }), entry()]),
    ).toBe("135 lb × 8/–");
  });

  it("spells out mixed weights and set types", () => {
    expect(
      summarizeEntries([
        entry({ weight: 95, reps: 8, type: "warmup" }),
        entry({ weight: 135, reps: 8 }),
        entry({ weight: 140, reps: 6, type: "drop" }),
      ]),
    ).toBe("95×8 (W), 135×8, 140×6 (D)");
  });

  it("handles bodyweight entries", () => {
    expect(
      summarizeEntries([
        entry({ weight: null, reps: 10 }),
        entry({ weight: 25, reps: 8 }),
      ]),
    ).toBe("BW×10, 25×8");
  });
});
