import { beforeEach, describe, expect, it, vi } from "vitest";
import { GUEST_KEYS } from "@/lib/guestMode";
import { installLocalStorage } from "@/test/localStorageMock";
import { migrateGuestDataToAccount } from "./guestMigration";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Replace the Supabase client with a recorder: every upsert/insert lands in
// mocks.calls, and selects on workout_templates answer from
// mocks.existingTemplates. vi.hoisted lets the vi.mock factory (which is
// hoisted above the imports) share state with the tests below.
const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  calls: [],
  existingTemplates: [],
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: { getUser: mocks.getUser },
    from: (table) => ({
      upsert: async (rows, options) => {
        mocks.calls.push({ table, method: "upsert", rows, options });
        return { error: null };
      },
      insert: async (rows) => {
        mocks.calls.push({ table, method: "insert", rows });
        return { error: null };
      },
      select: async () => ({ data: mocks.existingTemplates, error: null }),
    }),
  },
}));

function seed(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function callsTo(table) {
  return mocks.calls.filter((c) => c.table === table);
}

const SESSION_ID = "11111111-1111-4111-8111-111111111111";
const EXERCISE_ID = "22222222-2222-4222-8222-222222222222";

beforeEach(() => {
  installLocalStorage();
  mocks.calls.length = 0;
  mocks.existingTemplates = [];
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});

describe("migrateGuestDataToAccount", () => {
  it("throws when not signed in", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    await expect(migrateGuestDataToAccount()).rejects.toThrow("Not signed in");
  });

  it("upserts sessions and exercises, normalizing values and clearing guest data", async () => {
    seed(GUEST_KEYS.sessions, {
      "2026-06-10": [
        {
          id: SESSION_ID,
          name: "Push",
          position: 0,
          durationSeconds: 120,
          createdAt: "2026-06-10T10:00:00.000Z",
        },
      ],
    });
    seed(GUEST_KEYS.workouts, {
      "2026-06-10": [
        {
          id: EXERCISE_ID,
          name: "Bench Press",
          weight: "",
          sets: "3",
          reps: "8",
          completedReps: ["8", "8"],
          sessionId: SESSION_ID,
        },
      ],
    });
    seed(GUEST_KEYS.checkins, ["2026-06-10"]);
    localStorage.setItem("guest:active", "1");

    const result = await migrateGuestDataToAccount();

    const [sessionCall] = callsTo("workout_sessions");
    expect(sessionCall.rows).toEqual([
      {
        id: SESSION_ID,
        user_id: "user-1",
        date: "2026-06-10",
        name: "Push",
        position: 0,
        duration_seconds: 120,
        created_at: "2026-06-10T10:00:00.000Z",
      },
    ]);

    const [exerciseCall] = callsTo("exercises");
    expect(exerciseCall.rows).toEqual([
      {
        id: EXERCISE_ID,
        user_id: "user-1",
        date: "2026-06-10",
        session_id: SESSION_ID,
        name: "Bench Press",
        weight: null, // "" normalizes to null
        sets: 3, // numeric strings become numbers
        reps: 8,
        notes: "",
        completed_reps: ["8", "8"],
        position: 0,
      },
    ]);

    const [checkinCall] = callsTo("checkins");
    expect(checkinCall.rows).toEqual([{ user_id: "user-1", date: "2026-06-10" }]);
    expect(checkinCall.options).toEqual({ ignoreDuplicates: true });

    expect(result).toEqual({
      workoutDays: 1,
      sessions: 1,
      exercises: 1,
      checkins: 1,
      templates: 0,
    });

    // Guest data and the guest flag are cleared after a successful run
    expect(localStorage.getItem(GUEST_KEYS.workouts)).toBeNull();
    expect(localStorage.getItem(GUEST_KEYS.sessions)).toBeNull();
    expect(localStorage.getItem("guest:active")).toBeNull();
  });

  it("remaps legacy non-UUID ids consistently so session links survive", async () => {
    seed(GUEST_KEYS.sessions, {
      "2026-06-10": [
        {
          id: "old-session",
          name: null,
          position: 0,
          durationSeconds: 0,
          createdAt: "2026-06-10T10:00:00.000Z",
        },
      ],
    });
    seed(GUEST_KEYS.workouts, {
      "2026-06-10": [
        { id: "old-ex", name: "Squat", sets: 3, reps: 5, sessionId: "old-session" },
      ],
    });

    await migrateGuestDataToAccount();

    const [sessionRow] = callsTo("workout_sessions")[0].rows;
    const [exerciseRow] = callsTo("exercises")[0].rows;
    expect(sessionRow.id).toMatch(UUID_RE);
    expect(sessionRow.id).not.toBe("old-session");
    expect(exerciseRow.id).toMatch(UUID_RE);
    expect(exerciseRow.session_id).toBe(sessionRow.id);
  });

  it("skips templates that already exist with identical exercises", async () => {
    // Key order differs, but canonical comparison sees them as identical
    mocks.existingTemplates = [
      { name: "My Split", exercises: [{ name: "Squat", weight: 200 }] },
    ];
    seed(GUEST_KEYS.templates, [
      { id: "t1", name: "My Split", exercises: [{ weight: 200, name: "Squat" }] },
    ]);

    const result = await migrateGuestDataToAccount();
    expect(callsTo("workout_templates")).toEqual([]);
    expect(result.templates).toBe(0);
  });

  it("renames conflicting templates instead of overwriting", async () => {
    mocks.existingTemplates = [
      { name: "My Split", exercises: [{ name: "Squat" }] },
      { name: "My Split (imported)", exercises: [{ name: "Deadlift" }] },
    ];
    seed(GUEST_KEYS.templates, [
      { id: "t1", name: "My Split", exercises: [{ name: "Bench Press" }] },
    ]);

    await migrateGuestDataToAccount();

    const [insertCall] = callsTo("workout_templates");
    expect(insertCall.method).toBe("insert");
    expect(insertCall.rows).toEqual([
      {
        user_id: "user-1",
        // The suffix sequence is "(imported)", "(imported 2)", ... — the
        // plain "(imported)" counts as the first copy
        name: "My Split (imported 2)",
        exercises: [{ name: "Bench Press" }],
      },
    ]);
  });

  it("leaves untouched sample templates behind", async () => {
    seed(GUEST_KEYS.templates, [
      { id: "t1", name: "Push Day", isSample: true, exercises: [] },
    ]);

    const result = await migrateGuestDataToAccount();
    expect(callsTo("workout_templates")).toEqual([]);
    expect(result.templates).toBe(0);
  });
});
