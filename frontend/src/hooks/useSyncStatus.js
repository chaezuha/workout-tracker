import { useSyncExternalStore } from "react";
import { subscribe as subscribeOutbox, size } from "@/services/outbox";

function subscribeOnline(callback) {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => {
    window.removeEventListener("online", callback);
    window.removeEventListener("offline", callback);
  };
}

// Live sync state for the signed-in user: how many outbox ops still need to
// reach Supabase, and whether the browser thinks it's online. `online` is a
// display hint only — the flush never consults it (see services/sync.js).
export function useSyncStatus() {
  const pending = useSyncExternalStore(subscribeOutbox, size);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine);
  return { pending, online };
}
