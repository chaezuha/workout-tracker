import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetCheckinDates,
  localAddCheckin,
  localRemoveCheckin,
} from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { enqueue, pendingCheckins } from "@/services/outbox";

export async function getCheckinDates() {
  if (isGuestMode()) return localGetCheckinDates();
  try {
    const { data, error } = await supabase.from("checkins").select("date");
    if (error) throw error;
    // Pending offline toggles overlay the server list.
    let dates = data.map((r) => r.date);
    for (const { dateKey, present } of pendingCheckins()) {
      dates = dates.filter((d) => d !== dateKey);
      if (present) dates.push(dateKey);
    }
    cacheStore.replaceCheckins(dates);
    return dates;
  } catch (err) {
    console.warn("Serving check-ins from local cache", err?.message ?? err);
    return cacheStore.getCheckinDates();
  }
}

export async function addCheckin(dateKey) {
  if (isGuestMode()) return localAddCheckin(dateKey);
  cacheStore.addCheckin(dateKey);
  enqueue({ type: "checkin", dateKey, present: true });
}

export async function removeCheckin(dateKey) {
  if (isGuestMode()) return localRemoveCheckin(dateKey);
  cacheStore.removeCheckin(dateKey);
  enqueue({ type: "checkin", dateKey, present: false });
}
