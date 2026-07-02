import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetCheckinDates,
  localAddCheckin,
  localRemoveCheckin,
} from "@/services/localStore";

export async function getCheckinDates() {
  if (isGuestMode()) return localGetCheckinDates();
  const { data, error } = await supabase.from("checkins").select("date");
  if (error) throw error;
  return data.map((r) => r.date);
}

export async function addCheckin(dateKey) {
  if (isGuestMode()) return localAddCheckin(dateKey);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { error } = await supabase
    .from("checkins")
    .upsert({ user_id: user.id, date: dateKey });
  if (error) throw error;
}

export async function removeCheckin(dateKey) {
  if (isGuestMode()) return localRemoveCheckin(dateKey);
  const { error } = await supabase
    .from("checkins")
    .delete()
    .eq("date", dateKey);
  if (error) throw error;
}
