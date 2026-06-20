const STORAGE_KEY = "workouts";

function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(all) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
}

export async function getWorkoutsForDate(dateKey) {
  const all = readAll();
  return all[dateKey] ?? [];
}

export async function saveWorkoutsForDate(dateKey, exercises) {
  const all = readAll();
  if (!exercises || exercises.length === 0) {
    delete all[dateKey];
  } else {
    all[dateKey] = exercises;
  }
  writeAll(all);
}

export async function getDatesWithWorkouts() {
  return Object.keys(readAll());
}
