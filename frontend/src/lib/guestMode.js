const FLAG_KEY = "guest:active";

export const GUEST_KEYS = {
  workouts: "guest:workouts",
  checkins: "guest:checkins",
  templates: "guest:templates",
  seeded: "guest:seeded",
};

export function isGuestMode() {
  return localStorage.getItem(FLAG_KEY) === "1";
}

export function enableGuestMode() {
  localStorage.setItem(FLAG_KEY, "1");
}

// Leaves guest data in place so a returning guest (or a future
// guest-to-account migration) can pick it back up.
export function disableGuestMode() {
  localStorage.removeItem(FLAG_KEY);
}

export function clearGuestData() {
  localStorage.removeItem(FLAG_KEY);
  Object.values(GUEST_KEYS).forEach((key) => localStorage.removeItem(key));
}
