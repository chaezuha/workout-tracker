import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import { localGetAllExerciseRows } from "@/services/localStore";

// Rows must be sorted date desc / position desc so the first entry per name
// is the latest logged one.
function toSuggestions(rows) {
  const byName = new Map();
  for (const row of rows) {
    const name = row.name.trim();
    if (!name) continue;
    const key = name.toLowerCase();
    if (!byName.has(key)) {
      byName.set(key, {
        name,
        weight: row.weight ?? "",
        sets: row.sets,
        reps: row.reps,
      });
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name));
}

// Latest logged entry per distinct exercise name, for autocomplete + prefill.
export async function getExerciseSuggestions() {
  if (isGuestMode()) return toSuggestions(localGetAllExerciseRows());
  const { data, error } = await supabase
    .from("exercises")
    .select("name, weight, sets, reps, date, position")
    .order("date", { ascending: false })
    .order("position", { ascending: false });
  if (error) throw error;
  return toSuggestions(data);
}
