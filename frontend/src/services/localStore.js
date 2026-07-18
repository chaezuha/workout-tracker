import { GUEST_KEYS } from "@/lib/guestMode";
import { reportStorageWriteFailure } from "@/lib/storageEvents";

// localStorage-backed counterparts of the Supabase services. Exercises are
// stored in app shape ({ id, name, weight, sets, reps, notes, completedReps })
// plus a sessionId; array order is the position. Sessions are stored per date
// as { id, name, position, durationSeconds, createdAt }.
//
// createLocalStore binds the function set to a keys object, so the same code
// backs two stores: the guest store (guest:* keys, the data itself) and the
// signed-in user's mirror (cache:* keys, a local copy of Supabase kept by
// services/sync.js for offline reads and writes).

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
    return true;
  } catch (err) {
    console.error("Failed to write local data", err);
    reportStorageWriteFailure();
    return false;
  }
}

function stripSessionId(exercise) {
  const copy = { ...exercise };
  delete copy.sessionId;
  return copy;
}

function assertUniqueName(templates, name, ignoreId) {
  if (templates.some((t) => t.id !== ignoreId && t.name === name)) {
    throw new Error("A workout with that name already exists.");
  }
}

export function createLocalStore(keys) {
  // --- Workouts ---

  function getDayForDate(dateKey) {
    const workoutsAll = readJSON(keys.workouts, {});
    const sessionsAll = readJSON(keys.sessions, {});
    let exercises = workoutsAll[dateKey] ?? [];
    let sessions = (sessionsAll[dateKey] ?? [])
      .slice()
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    let migrated = false;

    // Lazy migration of pre-session data: old session records were
    // duration-only ({ id, durationSeconds, createdAt }) and exercises had no
    // sessionId.
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
      writeJSON(keys.sessions, sessionsAll);
      writeJSON(keys.workouts, workoutsAll);
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

  function saveDay(dateKey, sessions) {
    const workoutsAll = readJSON(keys.workouts, {});
    const sessionsAll = readJSON(keys.sessions, {});
    const prev = new Map((sessionsAll[dateKey] ?? []).map((s) => [s.id, s]));

    const sessionRecords = (sessions ?? []).map((s, i) => ({
      id: s.id,
      name: s.name?.trim() || null,
      position: i,
      // Day-saves never write durations; addSessionDuration owns them.
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
    writeJSON(keys.sessions, sessionsAll);
    writeJSON(keys.workouts, workoutsAll);
  }

  // Cache a server-fetched day verbatim — unlike saveDay this takes the
  // incoming durations as truth instead of preserving stored ones.
  function replaceDay(dateKey, sessions) {
    const workoutsAll = readJSON(keys.workouts, {});
    const sessionsAll = readJSON(keys.sessions, {});

    const sessionRecords = (sessions ?? []).map((s, i) => ({
      id: s.id,
      name: s.name ?? null,
      position: s.position ?? i,
      durationSeconds: s.durationSeconds ?? 0,
      createdAt: s.createdAt,
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
    writeJSON(keys.sessions, sessionsAll);
    writeJSON(keys.workouts, workoutsAll);
  }

  // Full hydration from the server: replaces all workout days, check-ins and
  // templates. Entries in preserveDates / preserveTemplateIds keep their
  // current local state (present or absent) — they have unsynced edits that a
  // server read must not clobber.
  function replaceAll(
    { days = {}, checkins = [], templates = [] },
    { preserveDates = new Set(), preserveTemplateIds = new Set() } = {},
  ) {
    const prevWorkouts = readJSON(keys.workouts, {});
    const prevSessions = readJSON(keys.sessions, {});
    const workoutsAll = {};
    const sessionsAll = {};

    for (const [dateKey, sessions] of Object.entries(days)) {
      if (preserveDates.has(dateKey)) continue;
      const sessionRecords = sessions.map((s, i) => ({
        id: s.id,
        name: s.name ?? null,
        position: s.position ?? i,
        durationSeconds: s.durationSeconds ?? 0,
        createdAt: s.createdAt,
      }));
      const exerciseRecords = sessions.flatMap((s) =>
        s.exercises.map((e) => ({ ...e, sessionId: s.id })),
      );
      if (sessionRecords.length) sessionsAll[dateKey] = sessionRecords;
      if (exerciseRecords.length) workoutsAll[dateKey] = exerciseRecords;
    }
    for (const dateKey of preserveDates) {
      if (prevSessions[dateKey]) sessionsAll[dateKey] = prevSessions[dateKey];
      if (prevWorkouts[dateKey]) workoutsAll[dateKey] = prevWorkouts[dateKey];
    }

    const prevTemplates = readJSON(keys.templates, []);
    const nextTemplates = templates
      .filter((t) => !preserveTemplateIds.has(t.id))
      .concat(prevTemplates.filter((t) => preserveTemplateIds.has(t.id)));

    writeJSON(keys.workouts, workoutsAll);
    writeJSON(keys.sessions, sessionsAll);
    writeJSON(keys.checkins, checkins);
    writeJSON(keys.templates, nextTemplates);
  }

  // Sessions count too: a timed session with no exercises still marks the
  // date (calendar dots, CSV export, import skip-list).
  function getDatesWithWorkouts() {
    return [
      ...new Set([
        ...Object.keys(readJSON(keys.workouts, {})),
        ...Object.keys(readJSON(keys.sessions, {})),
      ]),
    ];
  }

  // Flattened rows in Supabase row shape, sorted date desc / position desc to
  // match the query in getExerciseSuggestions.
  function getAllExerciseRows() {
    const all = readJSON(keys.workouts, {});
    const rows = [];
    for (const [date, exercises] of Object.entries(all)) {
      exercises.forEach((e, position) => {
        rows.push({
          name: e.name,
          weight: e.weight === "" || e.weight == null ? null : Number(e.weight),
          sets: Number(e.sets),
          reps: Number(e.reps),
          completedReps: e.completedReps ?? [],
          setEntries: e.setEntries ?? null,
          sessionId: e.sessionId ?? null,
          date,
          position,
        });
      });
    }
    return rows.sort((a, b) =>
      a.date === b.date ? b.position - a.position : b.date.localeCompare(a.date),
    );
  }

  // Flattened session rows ({ id, date, durationSeconds }) for stats. Dates
  // with workouts but no session entry (pre-session data whose lazy migration
  // in getDayForDate hasn't run yet) count as one zero-duration session; those
  // synthetic rows carry a null id.
  function getAllSessionRows() {
    const sessionsAll = readJSON(keys.sessions, {});
    const rows = [];
    for (const [date, sessions] of Object.entries(sessionsAll)) {
      for (const s of sessions) {
        rows.push({ id: s.id, date, durationSeconds: s.durationSeconds ?? 0 });
      }
    }
    const datesWithSessions = new Set(Object.keys(sessionsAll));
    for (const date of Object.keys(readJSON(keys.workouts, {}))) {
      if (!datesWithSessions.has(date)) {
        rows.push({ id: null, date, durationSeconds: 0 });
      }
    }
    return rows;
  }

  // --- Workout sessions ---

  function addSessionDuration(dateKey, sessionId, seconds) {
    const all = readJSON(keys.sessions, {});
    const session = (all[dateKey] ?? []).find((s) => s.id === sessionId);
    if (!session) {
      console.error("No session found to add duration to", dateKey, sessionId);
      return;
    }
    session.durationSeconds = (session.durationSeconds ?? 0) + seconds;
    writeJSON(keys.sessions, all);
    return session.durationSeconds;
  }

  // --- Check-ins ---

  function getCheckinDates() {
    return readJSON(keys.checkins, []);
  }

  function addCheckin(dateKey) {
    const dates = readJSON(keys.checkins, []);
    if (!dates.includes(dateKey)) {
      writeJSON(keys.checkins, dates.concat(dateKey));
    }
  }

  function removeCheckin(dateKey) {
    const dates = readJSON(keys.checkins, []);
    writeJSON(
      keys.checkins,
      dates.filter((d) => d !== dateKey),
    );
  }

  // Cache a server-fetched check-in list verbatim.
  function replaceCheckins(dates) {
    writeJSON(keys.checkins, dates);
  }

  // --- Templates ---

  function getTemplates() {
    return readJSON(keys.templates, []).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  function createTemplate(name, exercises) {
    const templates = readJSON(keys.templates, []);
    assertUniqueName(templates, name);
    const template = { id: crypto.randomUUID(), name, exercises };
    writeJSON(keys.templates, templates.concat(template));
    return template;
  }

  function updateTemplate(id, { name, exercises }) {
    const templates = readJSON(keys.templates, []);
    assertUniqueName(templates, name, id);
    const template = { id, name, exercises };
    writeJSON(
      keys.templates,
      templates.map((t) => (t.id === id ? template : t)),
    );
    return template;
  }

  function deleteTemplate(id) {
    const templates = readJSON(keys.templates, []);
    writeJSON(
      keys.templates,
      templates.filter((t) => t.id !== id),
    );
  }

  // Cache a server-fetched template list verbatim.
  function replaceTemplates(templates) {
    writeJSON(keys.templates, templates);
  }

  function clear() {
    Object.values(keys).forEach((key) => localStorage.removeItem(key));
  }

  return {
    getDayForDate,
    saveDay,
    replaceDay,
    replaceAll,
    getDatesWithWorkouts,
    getAllExerciseRows,
    getAllSessionRows,
    addSessionDuration,
    getCheckinDates,
    addCheckin,
    removeCheckin,
    replaceCheckins,
    getTemplates,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    replaceTemplates,
    clear,
  };
}

// --- Guest store (original API, kept so callers and tests stay unchanged) ---

const guestStore = createLocalStore(GUEST_KEYS);

export const localGetDayForDate = guestStore.getDayForDate;
export const localSaveDay = guestStore.saveDay;
export const localGetDatesWithWorkouts = guestStore.getDatesWithWorkouts;
export const localGetAllExerciseRows = guestStore.getAllExerciseRows;
export const localGetAllSessionRows = guestStore.getAllSessionRows;
export const localAddSessionDuration = guestStore.addSessionDuration;
export const localGetCheckinDates = guestStore.getCheckinDates;
export const localAddCheckin = guestStore.addCheckin;
export const localRemoveCheckin = guestStore.removeCheckin;
export const localGetTemplates = guestStore.getTemplates;
export const localCreateTemplate = guestStore.createTemplate;
export const localUpdateTemplate = guestStore.updateTemplate;
export const localDeleteTemplate = guestStore.deleteTemplate;

// True when there is guest data worth migrating to an account: any workout
// day, session, check-in, or non-sample template.
export function localHasGuestData() {
  if (Object.keys(readJSON(GUEST_KEYS.workouts, {})).length) return true;
  if (Object.keys(readJSON(GUEST_KEYS.sessions, {})).length) return true;
  if (readJSON(GUEST_KEYS.checkins, []).length) return true;
  return readJSON(GUEST_KEYS.templates, []).some((t) => !t.isSample);
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
