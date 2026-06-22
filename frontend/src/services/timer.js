const STORAGE_KEY = "workout-timer";

export function getWorkoutTimer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveWorkoutTimer(startedAt) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ startedAt }));
}

export function clearWorkoutTimer() {
  localStorage.removeItem(STORAGE_KEY);
}

const REST_STORAGE_KEY = "rest-timer";

export function getRestTimer() {
  try {
    const raw = localStorage.getItem(REST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveRestTimer(endsAt) {
  localStorage.setItem(REST_STORAGE_KEY, JSON.stringify({ endsAt }));
}

export function clearRestTimer() {
  localStorage.removeItem(REST_STORAGE_KEY);
}
