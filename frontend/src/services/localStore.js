import { GUEST_KEYS } from "@/lib/guestMode";

// localStorage-backed counterparts of the Supabase services, used in guest
// mode. Exercises are stored in app shape ({ id, name, weight, sets, reps,
// notes, completedReps }) plus a sessionId; array order is the position.
// Sessions are stored per date as { id, name, position, durationSeconds,
// createdAt }.

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.error("Failed to write guest data", err);
  }
}

// True when there is guest data worth migrating to an account: any workout
// day, session, check-in, or non-sample template.
export function localHasGuestData() {
  if (Object.keys(readJSON(GUEST_KEYS.workouts, {})).length) return true;
  if (Object.keys(readJSON(GUEST_KEYS.sessions, {})).length) return true;
  if (readJSON(GUEST_KEYS.checkins, []).length) return true;
  return readJSON(GUEST_KEYS.templates, []).some((t) => !t.isSample);
}

// --- Workouts ---

function stripSessionId(exercise) {
  const copy = { ...exercise };
  delete copy.sessionId;
  return copy;
}

export function localGetDayForDate(dateKey) {
  const workoutsAll = readJSON(GUEST_KEYS.workouts, {});
  const sessionsAll = readJSON(GUEST_KEYS.sessions, {});
  let exercises = workoutsAll[dateKey] ?? [];
  let sessions = (sessionsAll[dateKey] ?? [])
    .slice()
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
  let migrated = false;

  // Lazy migration of pre-session data: old session records were duration-only
  // ({ id, durationSeconds, createdAt }) and exercises had no sessionId.
  if (sessions.some((s) => s.position == null || s.name === undefined)) {
    sessions = sessions.map((s, i) => ({
      name: null,
      ...s,
      position: s.position ?? i,
    }));
    migrated = true;
  }

  if (exercises.length && !sessions.length) {
    sessions = [
      {
        id: crypto.randomUUID(),
        name: null,
        position: 0,
        durationSeconds: 0,
        createdAt: new Date().toISOString(),
      },
    ];
    migrated = true;
  }

  const sessionIds = new Set(sessions.map((s) => s.id));
  if (exercises.some((e) => !sessionIds.has(e.sessionId))) {
    const firstId = sessions[0].id;
    exercises = exercises.map((e) =>
      sessionIds.has(e.sessionId) ? e : { ...e, sessionId: firstId },
    );
    migrated = true;
  }

  if (migrated) {
    sessionsAll[dateKey] = sessions;
    if (exercises.length) workoutsAll[dateKey] = exercises;
    writeJSON(GUEST_KEYS.sessions, sessionsAll);
    writeJSON(GUEST_KEYS.workouts, workoutsAll);
  }

  return sessions.map((s) => ({
    id: s.id,
    name: s.name ?? null,
    position: s.position ?? 0,
    durationSeconds: s.durationSeconds ?? 0,
    createdAt: s.createdAt,
    exercises: exercises
      .filter((e) => e.sessionId === s.id)
      .map(stripSessionId),
  }));
}

export function localSaveDay(dateKey, sessions) {
  const workoutsAll = readJSON(GUEST_KEYS.workouts, {});
  const sessionsAll = readJSON(GUEST_KEYS.sessions, {});
  const prev = new Map((sessionsAll[dateKey] ?? []).map((s) => [s.id, s]));

  const sessionRecords = (sessions ?? []).map((s, i) => ({
    id: s.id,
    name: s.name?.trim() || null,
    position: i,
    // Day-saves never write durations; localAddSessionDuration owns them.
    durationSeconds: prev.get(s.id)?.durationSeconds ?? 0,
    createdAt: s.createdAt ?? new Date().toISOString(),
  }));
  const exerciseRecords = (sessions ?? []).flatMap((s) =>
    s.exercises.map((e) => ({ ...e, sessionId: s.id })),
  );

  if (sessionRecords.length) {
    sessionsAll[dateKey] = sessionRecords;
  } else {
    delete sessionsAll[dateKey];
  }
  if (exerciseRecords.length) {
    workoutsAll[dateKey] = exerciseRecords;
  } else {
    delete workoutsAll[dateKey];
  }
  writeJSON(GUEST_KEYS.sessions, sessionsAll);
  writeJSON(GUEST_KEYS.workouts, workoutsAll);
}

export function localGetDatesWithWorkouts() {
  return Object.keys(readJSON(GUEST_KEYS.workouts, {}));
}

// Flattened rows in Supabase row shape, sorted date desc / position desc to
// match the query in getExerciseSuggestions.
export function localGetAllExerciseRows() {
  const all = readJSON(GUEST_KEYS.workouts, {});
  const rows = [];
  for (const [date, exercises] of Object.entries(all)) {
    exercises.forEach((e, position) => {
      rows.push({
        name: e.name,
        weight: e.weight === "" || e.weight == null ? null : Number(e.weight),
        sets: Number(e.sets),
        reps: Number(e.reps),
        date,
        position,
      });
    });
  }
  return rows.sort((a, b) =>
    a.date === b.date ? b.position - a.position : b.date.localeCompare(a.date),
  );
}

// Flattened session rows ({ date, durationSeconds }) for stats. Dates with
// workouts but no session entry (pre-session data whose lazy migration in
// localGetDayForDate hasn't run yet) count as one zero-duration session.
export function localGetAllSessionRows() {
  const sessionsAll = readJSON(GUEST_KEYS.sessions, {});
  const rows = [];
  for (const [date, sessions] of Object.entries(sessionsAll)) {
    for (const s of sessions) {
      rows.push({ date, durationSeconds: s.durationSeconds ?? 0 });
    }
  }
  const datesWithSessions = new Set(Object.keys(sessionsAll));
  for (const date of Object.keys(readJSON(GUEST_KEYS.workouts, {}))) {
    if (!datesWithSessions.has(date)) {
      rows.push({ date, durationSeconds: 0 });
    }
  }
  return rows;
}

// --- Workout sessions ---

export function localAddSessionDuration(dateKey, sessionId, seconds) {
  const all = readJSON(GUEST_KEYS.sessions, {});
  const session = (all[dateKey] ?? []).find((s) => s.id === sessionId);
  if (!session) {
    console.error("No session found to add duration to", dateKey, sessionId);
    return;
  }
  session.durationSeconds = (session.durationSeconds ?? 0) + seconds;
  writeJSON(GUEST_KEYS.sessions, all);
  return session.durationSeconds;
}

// --- Check-ins ---

export function localGetCheckinDates() {
  return readJSON(GUEST_KEYS.checkins, []);
}

export function localAddCheckin(dateKey) {
  const dates = readJSON(GUEST_KEYS.checkins, []);
  if (!dates.includes(dateKey)) {
    writeJSON(GUEST_KEYS.checkins, dates.concat(dateKey));
  }
}

export function localRemoveCheckin(dateKey) {
  const dates = readJSON(GUEST_KEYS.checkins, []);
  writeJSON(
    GUEST_KEYS.checkins,
    dates.filter((d) => d !== dateKey),
  );
}

// --- Templates ---

function assertUniqueName(templates, name, ignoreId) {
  if (templates.some((t) => t.id !== ignoreId && t.name === name)) {
    throw new Error("A workout with that name already exists.");
  }
}

export function localGetTemplates() {
  return readJSON(GUEST_KEYS.templates, []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

export function localCreateTemplate(name, exercises) {
  const templates = readJSON(GUEST_KEYS.templates, []);
  assertUniqueName(templates, name);
  const template = { id: crypto.randomUUID(), name, exercises };
  writeJSON(GUEST_KEYS.templates, templates.concat(template));
  return template;
}

export function localUpdateTemplate(id, { name, exercises }) {
  const templates = readJSON(GUEST_KEYS.templates, []);
  assertUniqueName(templates, name, id);
  const template = { id, name, exercises };
  writeJSON(
    GUEST_KEYS.templates,
    templates.map((t) => (t.id === id ? template : t)),
  );
  return template;
}

export function localDeleteTemplate(id) {
  const templates = readJSON(GUEST_KEYS.templates, []);
  writeJSON(
    GUEST_KEYS.templates,
    templates.filter((t) => t.id !== id),
  );
}

// --- Sample data ---

// Template exercises use the same id-less shape SavedWorkouts stores
// ({ name, weight, sets, reps, notes }); ids are generated on load.
const SAMPLE_TEMPLATES = [
  {
    name: "Push Day",
    exercises: [
      { name: "Bench Press", weight: 135, sets: 3, reps: 8, notes: "" },
      { name: "Overhead Press", weight: 65, sets: 3, reps: 10, notes: "" },
      { name: "Incline Dumbbell Press", weight: 40, sets: 3, reps: 10, notes: "" },
      { name: "Tricep Pushdown", weight: 50, sets: 3, reps: 12, notes: "" },
    ],
  },
  {
    name: "Pull Day",
    exercises: [
      { name: "Deadlift", weight: 185, sets: 3, reps: 5, notes: "" },
      { name: "Lat Pulldown", weight: 100, sets: 3, reps: 10, notes: "" },
      { name: "Seated Row", weight: 90, sets: 3, reps: 10, notes: "" },
      { name: "Bicep Curl", weight: 25, sets: 3, reps: 12, notes: "" },
    ],
  },
  {
    name: "Leg Day",
    exercises: [
      { name: "Squat", weight: 155, sets: 3, reps: 8, notes: "" },
      { name: "Romanian Deadlift", weight: 135, sets: 3, reps: 10, notes: "" },
      { name: "Leg Press", weight: 180, sets: 3, reps: 10, notes: "" },
      { name: "Calf Raise", weight: 90, sets: 3, reps: 15, notes: "" },
    ],
  },
];

export function seedGuestTemplatesOnce() {
  if (localStorage.getItem(GUEST_KEYS.seeded) === "1") return;
  if (!readJSON(GUEST_KEYS.templates, []).length) {
    writeJSON(
      GUEST_KEYS.templates,
      SAMPLE_TEMPLATES.map((t) => ({
        id: crypto.randomUUID(),
        isSample: true,
        ...t,
      })),
    );
  }
  localStorage.setItem(GUEST_KEYS.seeded, "1");
}
