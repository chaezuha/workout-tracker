import { supabase } from "@/lib/supabase";
import { isGuestMode } from "@/lib/guestMode";
import {
  localGetTemplates,
  localCreateTemplate,
  localUpdateTemplate,
  localDeleteTemplate,
} from "@/services/localStore";
import { cacheStore } from "@/services/cacheStore";
import { enqueue, pendingTemplateIds } from "@/services/outbox";

function rowToTemplate(row) {
  return {
    id: row.id,
    name: row.name,
    exercises: row.exercises ?? [],
  };
}

export async function getTemplates() {
  if (isGuestMode()) return localGetTemplates();
  try {
    const { data, error } = await supabase
      .from("workout_templates")
      .select("*")
      .order("name", { ascending: true });
    if (error) throw error;
    // Templates with pending outbox ops keep their local state: an unsynced
    // create/edit stays visible, an unsynced delete stays gone.
    const pending = pendingTemplateIds();
    const merged = data
      .map(rowToTemplate)
      .filter((t) => !pending.has(t.id))
      .concat(cacheStore.getTemplates().filter((t) => pending.has(t.id)));
    cacheStore.replaceTemplates(merged);
    return merged.sort((a, b) => a.name.localeCompare(b.name));
  } catch (err) {
    console.warn("Serving templates from local cache", err?.message ?? err);
    return cacheStore.getTemplates();
  }
}

// Signed-in template writes are local-first like workouts: mirror + outbox.
// The mirror enforces the same unique-name rule the DB does, so the user
// still gets "already exists" feedback instantly (and offline).
export async function createTemplate(name, exercises) {
  if (isGuestMode()) return localCreateTemplate(name, exercises);
  const template = cacheStore.createTemplate(name, exercises);
  enqueue({ type: "templateSave", templateId: template.id });
  return template;
}

export async function updateTemplate(id, { name, exercises }) {
  if (isGuestMode()) return localUpdateTemplate(id, { name, exercises });
  const template = cacheStore.updateTemplate(id, { name, exercises });
  enqueue({ type: "templateSave", templateId: id });
  return template;
}

export async function deleteTemplate(id) {
  if (isGuestMode()) return localDeleteTemplate(id);
  cacheStore.deleteTemplate(id);
  enqueue({ type: "templateDelete", templateId: id });
}
