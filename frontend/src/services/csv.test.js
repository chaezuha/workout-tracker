import { describe, expect, it } from "vitest";
import {
  CSV_HEADER,
  parseCsv,
  planImport,
  rowsToDays,
  serializeDays,
} from "@/services/csv";

let nextId = 0;
const makeId = () => `id-${nextId++}`;

const day = (date, sessions) => ({ date, sessions });
const session = (overrides = {}) => ({
  id: "s1",
  name: "Push Day",
  position: 0,
  durationSeconds: 3600,
  createdAt: "2026-07-06T10:00:00.000Z",
  exercises: [
    {
      id: "e1",
      name: "Bench Press",
      weight: 100,
      sets: 3,
      reps: 5,
      notes: "",
      completedReps: [5, 5, 4],
    },
  ],
  ...overrides,
});

describe("serializeDays", () => {
  it("emits a header and one row per exercise, dates ascending", () => {
    const csv = serializeDays([
      day("2026-07-06", [session()]),
      day("2026-07-01", [session({ name: null })]),
    ]);
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe(CSV_HEADER.join(","));
    expect(lines[1]).toBe(
      "2026-07-01,,0,3600,Bench Press,100,3,5,5;5;4,",
    );
    expect(lines[2]).toBe(
      "2026-07-06,Push Day,0,3600,Bench Press,100,3,5,5;5;4,",
    );
  });

  it("emits a session-only row for sessions without exercises", () => {
    const csv = serializeDays([day("2026-07-06", [session({ exercises: [] })])]);
    expect(csv.trim().split("\r\n")[1]).toBe("2026-07-06,Push Day,0,3600,,,,,,");
  });

  it("escapes commas, quotes, and newlines", () => {
    const csv = serializeDays([
      day("2026-07-06", [
        session({
          name: 'Leg "day", heavy',
          exercises: [
            {
              name: "Squat",
              weight: 200,
              sets: 1,
              reps: 5,
              notes: "felt strong,\nkept depth",
              completedReps: [5],
            },
          ],
        }),
      ]),
    ]);
    expect(csv).toContain('"Leg ""day"", heavy"');
    expect(csv).toContain('"felt strong,\nkept depth"');
  });
});

describe("parseCsv", () => {
  it("parses quoted fields with commas, escaped quotes, and newlines", () => {
    const rows = parseCsv('a,"b,1","c""quoted""","line1\nline2"\r\nd,e,f,g\r\n');
    expect(rows).toEqual([
      ["a", "b,1", 'c"quoted"', "line1\nline2"],
      ["d", "e", "f", "g"],
    ]);
  });

  it("handles LF-only files and no trailing newline", () => {
    expect(parseCsv("a,b\nc,d")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("preserves empty fields", () => {
    expect(parseCsv("a,,c\n")).toEqual([["a", "", "c"]]);
  });
});

describe("rowsToDays", () => {
  it("round-trips serializeDays output", () => {
    const input = [
      day("2026-07-01", [
        session({
          name: null,
          durationSeconds: 0,
          exercises: [
            {
              name: "Deadlift, conventional",
              weight: 225,
              sets: 2,
              reps: 5,
              notes: 'note with "quotes"',
              completedReps: [5, 4],
            },
          ],
        }),
      ]),
      day("2026-07-06", [session(), session({ name: "Cooldown", position: 1, exercises: [] })]),
    ];
    const { days, errors } = rowsToDays(parseCsv(serializeDays(input)), {
      makeId,
    });
    expect(errors).toEqual([]);
    expect(days).toHaveLength(2);

    const [d1, d6] = days;
    expect(d1.date).toBe("2026-07-01");
    expect(d1.sessions[0].name).toBeNull();
    expect(d1.sessions[0].exercises[0]).toMatchObject({
      name: "Deadlift, conventional",
      weight: 225,
      sets: 2,
      reps: 5,
      notes: 'note with "quotes"',
      completedReps: [5, 4],
    });

    expect(d6.sessions).toHaveLength(2);
    expect(d6.sessions[0].name).toBe("Push Day");
    expect(d6.sessions[0].durationSeconds).toBe(3600);
    expect(d6.sessions[1].name).toBe("Cooldown");
    expect(d6.sessions[1].exercises).toEqual([]);
  });

  it("groups multiple sessions on one date by position", () => {
    const csv = [
      CSV_HEADER.join(","),
      "2026-07-06,B,1,0,Curl,20,3,10,,",
      "2026-07-06,A,0,600,Bench,100,3,5,5;5;5,",
      "2026-07-06,A,0,600,Row,80,3,8,,",
    ].join("\n");
    const { days } = rowsToDays(parseCsv(csv), { makeId });
    expect(days[0].sessions.map((s) => s.name)).toEqual(["A", "B"]);
    expect(days[0].sessions[0].exercises.map((e) => e.name)).toEqual([
      "Bench",
      "Row",
    ]);
    expect(days[0].sessions[0].position).toBe(0);
    expect(days[0].sessions[1].position).toBe(1);
  });

  it("collects invalid rows as errors without failing the rest", () => {
    const csv = [
      CSV_HEADER.join(","),
      "not-a-date,,0,0,Bench,100,3,5,,",
      "2026-07-06,,0,0,Bench,100,0,5,,",
      "2026-07-06,,0,0,Bench,abc,3,5,,",
      "2026-07-06,,0,0,Squat,200,3,5,5;x;4,",
    ].join("\n");
    const { days, errors } = rowsToDays(parseCsv(csv), { makeId });
    expect(errors.map((e) => e.line)).toEqual([2, 3, 4]);
    expect(days).toHaveLength(1);
    // invalid completedReps entries are dropped, not fatal
    expect(days[0].sessions[0].exercises[0].completedReps).toEqual([5, 4]);
  });

  it("parses empty completedReps to an empty array and keeps empty weight", () => {
    const csv = [
      CSV_HEADER.join(","),
      "2026-07-06,,0,0,Plank,,3,1,,bodyweight",
    ].join("\n");
    const { days, errors } = rowsToDays(parseCsv(csv), { makeId });
    expect(errors).toEqual([]);
    expect(days[0].sessions[0].exercises[0]).toMatchObject({
      weight: "",
      completedReps: [],
      notes: "bodyweight",
    });
  });

  it("rejects files without the required header", () => {
    const { days, errors } = rowsToDays(parseCsv("foo,bar\n1,2\n"), { makeId });
    expect(days).toEqual([]);
    expect(errors[0].line).toBe(1);
  });

  it("regenerates ids", () => {
    const csv = serializeDays([day("2026-07-06", [session()])]);
    const { days } = rowsToDays(parseCsv(csv), { makeId });
    expect(days[0].sessions[0].id).toMatch(/^id-/);
    expect(days[0].sessions[0].exercises[0].id).toMatch(/^id-/);
  });
});

describe("planImport", () => {
  const days = [day("2026-07-01", []), day("2026-07-06", [])];

  it("skips dates that already have data", () => {
    const { toImport, skippedDates } = planImport(["2026-07-06"], days);
    expect(toImport.map((d) => d.date)).toEqual(["2026-07-01"]);
    expect(skippedDates).toEqual(["2026-07-06"]);
  });

  it("imports everything when nothing exists", () => {
    const { toImport, skippedDates } = planImport([], days);
    expect(toImport).toHaveLength(2);
    expect(skippedDates).toEqual([]);
  });
});
