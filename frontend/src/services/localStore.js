import { GUEST_KEYS } from "@/lib/guestMode";

// localStorage-backed counterparts of the Supabase services, used in guest
// mode. Exercises are stored in app shape ({ id, name, weight, sets, reps,
// notes, completedReps }); array order is the position.

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

// --- Workouts ---

export function localGetWorkoutsForDate(dateKey) {
  const all = readJSON(GUEST_KEYS.workouts, {});
  return all[dateKey] ?? [];
}

export function localSaveWorkoutsForDate(dateKey, exercises) {
  const all = readJSON(GUEST_KEYS.workouts, {});
  if ((exercises ?? []).length) {
    all[dateKey] = exercises;
  } else {
    delete all[dateKey];
  }
  writeJSON(GUEST_KEYS.workouts, all);
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
      SAMPLE_TEMPLATES.map((t) => ({ id: crypto.randomUUID(), ...t })),
    );
  }
  localStorage.setItem(GUEST_KEYS.seeded, "1");
}
