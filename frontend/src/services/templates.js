import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetTemplates,
  localCreateTemplate,
  localUpdateTemplate,
  localDeleteTemplate,
} from "@/services/localStore";

function rowToTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    exercises: row.exercises ?? [],
  };
}

function translateError(error) {
  if (error?.code === "23505") {
    return new Error("A workout with that name already exists.");
  }
  return error;
}

export async function getTemplates() {
  if (isGuestMode()) return localGetTemplates();
  const { data, error } = await supabase
    .from("workout_templates")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data.map(rowToTemplate);
}

export async function createTemplate(name, exercises) {
  if (isGuestMode()) return localCreateTemplate(name, exercises);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not signed in");

  const { data, error } = await supabase
    .from("workout_templates")
    .insert({ user_id: user.id, name, exercises })
    .select()
    .single();
  if (error) throw translateError(error);
  return rowToTemplate(data);
}

export async function updateTemplate(id, { name, exercises }) {
  if (isGuestMode()) return localUpdateTemplate(id, { name, exercises });
  const { data, error } = await supabase
    .from("workout_templates")
    .update({ name, exercises })
    .eq("id", id)
    .select()
    .single();
  if (error) throw translateError(error);
  return rowToTemplate(data);
}

export async function deleteTemplate(id) {
  if (isGuestMode()) return localDeleteTemplate(id);
  const { error } = await supabase
    .from("workout_templates")
    .delete()
    .eq("id", id);
  if (error) throw error;
}
