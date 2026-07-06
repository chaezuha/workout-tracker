import { isGuestMode } from "@/lib/guestMode";
import { localAddSessionDuration } from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { enqueue } from "@/services/outbox";

// Adds seconds to a session's accumulated duration. Sessions themselves are
// created and deleted through saveDayForDate; this is the only code path
// that writes durations. Signed-in writes are local-first: the mirror is
// updated here and the outbox flush replays the add_session_duration RPC —
// additive on the server, so offline stops from two devices merge correctly.
export async function addSessionDuration(dateKey, sessionId, seconds) {
  if (isGuestMode()) return localAddSessionDuration(dateKey, sessionId, seconds);
  const total = cacheStore.addSessionDuration(dateKey, sessionId, seconds);
  enqueue({ type: "addDuration", dateKey, sessionId, seconds });
  return total;
}
