// Exported for the cross-tab `storage` event listener in useWorkoutTimer.
export const WORKOUT_TIMER_STORAGE_KEY = "workout-timer";
const STORAGE_KEY = WORKOUT_TIMER_STORAGE_KEY;

// Record shape: { status: "running", startedAt, accumulated, sessionId,
// dateKey, sessionName?, ownerId? } or the same with status "paused" (no
// startedAt needed), where accumulated is seconds elapsed before the current
// run segment and sessionId/dateKey name the session the time will be
// credited to on stop. sessionName is display-only; ownerId (user id or
// "guest") scopes the record to the identity that started it.
// Records saved before pause support existed only have { startedAt } and are
// treated as running; records from before sessions lack sessionId — the
// WorkoutPage adopts them onto a session on load. Records from before
// ownerId existed belong to whoever is signed in when they're read.
export function getWorkoutTimer() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const record = raw ? JSON.parse(raw) : null;
    if (!record) return null;
    if (!record.status) {
      return { status: "running", startedAt: record.startedAt, accumulated: 0 };
    }
    return record;
  } catch {
    return null;
  }
}

export function saveWorkoutTimer(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
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
