import { supabase } from "@/lib/supabase";

// Latest logged entry per distinct exercise name, for autocomplete + prefill.
export async function getExerciseSuggestions() {
  const { data, error } = await supabase
    .from("exercises")
    .select("name, weight, sets, reps, date, position")
    .order("date", { ascending: false })
    .order("position", { ascending: false });
  if (error) throw error;

  const byName = new Map();
  for (const row of data) {
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
