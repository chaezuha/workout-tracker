// localStorage keys for the signed-in user's local mirror and sync outbox.
// Deliberately separate from the guest:* keys so guest data survives sign-in
// for the guest-to-account migration prompt.

export const CACHE_KEYS = {
  workouts: "cache:workouts",
  sessions: "cache:sessions",
  checkins: "cache:checkins",
  templates: "cache:templates",
};

// Which user the cache:* mirror belongs to; a mismatch on sign-in means the
// mirror (and outbox) must be cleared before hydrating.
export const CACHE_USER_KEY = "cache:userId";

export const OUTBOX_KEY = "sync:outbox";
