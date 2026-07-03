import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import { localAddSessionDuration } from "@/services/localStore";

// Adds seconds to a session's accumulated duration. Sessions themselves are
// created and deleted through saveDayForDate; this is the only code path
// that writes duration_seconds.
export async function addSessionDuration(dateKey, sessionId, seconds) {
  if (isGuestMode()) return localAddSessionDuration(dateKey, sessionId, seconds);
  const { data, error } = await supabase.rpc("add_session_duration", {
    p_session_id: sessionId,
    p_seconds: seconds,
  });
  if (error) throw error;
  return data;
}
