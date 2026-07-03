const FLAG_KEY = "guest:active";

export const GUEST_KEYS = {
  workouts: "guest:workouts",
  checkins: "guest:checkins",
  templates: "guest:templates",
  sessions: "guest:sessions",
  seeded: "guest:seeded",
  migrateDeclined: "guest:migrateDeclined",
};

export function isGuestMode() {
  return localStorage.getItem(FLAG_KEY) === "1";
}

export function enableGuestMode() {
  localStorage.setItem(FLAG_KEY, "1");
  // A new guest era makes the migration prompt eligible again.
  localStorage.removeItem(GUEST_KEYS.migrateDeclined);
}

// Leaves guest data in place so a returning guest can pick it back up, and so
// the guest-to-account migration prompt can offer to import it after sign-in.
export function disableGuestMode() {
  localStorage.removeItem(FLAG_KEY);
}

export function isMigrationDeclined() {
  return localStorage.getItem(GUEST_KEYS.migrateDeclined) === "1";
}

export function setMigrationDeclined() {
  localStorage.setItem(GUEST_KEYS.migrateDeclined, "1");
}

export function clearGuestData() {
  localStorage.removeItem(FLAG_KEY);
  Object.values(GUEST_KEYS).forEach((key) => localStorage.removeItem(key));
}
