import { supabase } from "@/lib/supabase";
import { cacheStore } from "@/services/cacheStore";
import * as outbox from "@/services/outbox";
import {
  pushDayToSupabase,
  rowToSession,
  rowToExercise,
} from "@/services/workouts";

// Drains the outbox into Supabase and keeps the cache mirror hydrated. This
// is the only module that pushes signed-in writes to the server: services
// write the mirror and enqueue, and the flush here replays the queue whenever
// a trigger fires (came online, tab became visible, session refreshed).

const MAX_ATTEMPTS = 5;

// Server responses carry a code (SQLSTATE/PGRST*); failures to reach the
// server don't. navigator.onLine is not consulted anywhere — it lies behind
// captive portals, and a failed push classifies itself.
function isNetworkError(err) {
  if (!err) return false;
  if (err.code) return false;
  return /fetch|network|load failed|timed? ?out|connection/i.test(
    String(err.message ?? err),
  );
}

async function pushOp(op, userId) {
  switch (op.type) {
    case "saveDay": {
      const rev = op.rev ?? 0;
      // Payload derived from the mirror at push time: every offline edit to
      // this day is folded into one idempotent whole-day replay, and offline
      // deletes propagate because the replay removes missing rows.
      const sessions = cacheStore.getDayForDate(op.dateKey);
      await pushDayToSupabase(op.dateKey, sessions, userId);
      outbox.complete(op.id, { rev });
      return;
    }
    case "addDuration": {
      const seconds = op.seconds;
      if (seconds > 0) {
        const { error } = await supabase.rpc("add_session_duration", {
          p_session_id: op.sessionId,
          p_seconds: seconds,
        });
        if (error) throw error;
      }
      outbox.complete(op.id, { seconds });
      return;
    }
    case "checkin": {
      const rev = op.rev ?? 0;
      if (op.present) {
        const { error } = await supabase
          .from("checkins")
          .upsert({ user_id: userId, date: op.dateKey });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("checkins")
          .delete()
          .eq("date", op.dateKey);
        if (error) throw error;
      }
      outbox.complete(op.id, { rev });
      return;
    }
    case "templateSave": {
      const rev = op.rev ?? 0;
      const template = cacheStore
        .getTemplates()
        .find((t) => t.id === op.templateId);
      if (!template) return outbox.drop(op.id); // deleted locally meanwhile
      const row = {
        id: template.id,
        user_id: userId,
        name: template.name,
        exercises: template.exercises ?? [],
      };
      let { error } = await supabase.from("workout_templates").upsert(row);
      if (error?.code === "23505") {
        // Name collides with a template made on another device; rename like
        // guestMigration does and push once more.
        const renamed = `${template.name} (2)`;
        ({ error } = await supabase
          .from("workout_templates")
          .upsert({ ...row, name: renamed }));
        if (!error) {
          try {
            cacheStore.updateTemplate(template.id, {
              name: renamed,
              exercises: template.exercises ?? [],
            });
          } catch {
            // mirror rename is best-effort; hydrate will reconcile
          }
        }
      }
      if (error) throw error;
      outbox.complete(op.id, { rev });
      return;
    }
    case "templateDelete": {
      const { error } = await supabase
        .from("workout_templates")
        .delete()
        .eq("id", op.templateId);
      if (error) throw error;
      outbox.drop(op.id);
      return;
    }
    default:
      console.error("Unknown outbox op dropped", op);
      outbox.drop(op.id);
  }
}

// Pushes queued ops in order until the queue is empty ("done") or an op
// fails ("blocked"). Order matters: stopping on failure keeps a session's
// day-save ahead of its duration RPC.
async function flushPass() {
  let userId;
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return "blocked";
    // getSession lazily refreshes an expired access token — exactly what a
    // flush after a long offline stretch needs.
    userId = data?.session?.user?.id;
  } catch {
    return "blocked";
  }
  if (!userId) return "done"; // signed out; ops wait for the next sign-in

  for (;;) {
    const [op] = outbox.list();
    if (!op) return "done";
    try {
      await pushOp(op, userId);
    } catch (err) {
      if (!isNetworkError(err) && outbox.bumpAttempts(op.id) >= MAX_ATTEMPTS) {
        console.error("Dropping unsyncable change after repeated failures", op, err);
        outbox.drop(op.id);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("sync:op-dropped", { detail: { type: op.type } }),
          );
        }
        continue;
      }
      console.warn("Sync push failed; will retry", op.type, err?.message ?? err);
      return "blocked";
    }
  }
}

let current = null;

// Serialized: a flush requested while one is running waits for it, then runs
// one more pass if the outbox grew in the meantime.
export function flush() {
  if (current) {
    current.again = true;
    return current.promise;
  }
  const state = { again: true };
  state.promise = (async () => {
    while (state.again) {
      state.again = false;
      const status = await flushPass();
      if (status === "blocked" || outbox.size() === 0) break;
    }
  })().finally(() => {
    current = null;
  });
  current = state;
  return state.promise;
}

// Fire-and-forget flush for triggers and services.
export function requestFlush() {
  flush().catch((err) => console.error("Sync flush failed", err));
}

let hydratePromise = null;

// Full pull of the account's data into the cache mirror. The data volume is
// tiny (a workout log), and a full pull keeps offline stats and autocomplete
// complete. Dates and templates with pending outbox ops keep their local
// state — a server read must never clobber unsynced edits.
export function hydrate() {
  if (!hydratePromise) {
    hydratePromise = doHydrate()
      .catch((err) => console.warn("Hydrate skipped", err?.message ?? err))
      .finally(() => {
        hydratePromise = null;
      });
  }
  return hydratePromise;
}

async function doHydrate() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) return;

  const [sessionsRes, exercisesRes, checkinsRes, templatesRes] =
    await Promise.all([
      supabase
        .from("workout_sessions")
        .select("*")
        .order("position", { ascending: true }),
      supabase
        .from("exercises")
        .select("*")
        .order("position", { ascending: true }),
      supabase.from("checkins").select("date"),
      supabase.from("workout_templates").select("*"),
    ]);
  if (
    sessionsRes.error ||
    exercisesRes.error ||
    checkinsRes.error ||
    templatesRes.error
  ) {
    return; // likely offline; the mirror keeps its current state
  }

  const days = {};
  for (const row of sessionsRes.data) {
    (days[row.date] ??= []).push(rowToSession(row));
  }
  for (const row of exercisesRes.data) {
    let sessions = days[row.date];
    if (!sessions) {
      // Pre-migration exercise without a session row; group into one.
      sessions = days[row.date] = [
        {
          id: crypto.randomUUID(),
          name: null,
          position: 0,
          durationSeconds: 0,
          createdAt: new Date().toISOString(),
          exercises: [],
        },
      ];
    }
    const session = sessions.find((s) => s.id === row.session_id) ?? sessions[0];
    session.exercises.push(rowToExercise(row));
  }

  // Pending check-in toggles overlay the server list.
  let checkins = checkinsRes.data.map((r) => r.date);
  for (const { dateKey, present } of outbox.pendingCheckins()) {
    checkins = checkins.filter((d) => d !== dateKey);
    if (present) checkins.push(dateKey);
  }

  const templates = templatesRes.data.map((row) => ({
    id: row.id,
    name: row.name,
    exercises: row.exercises ?? [],
  }));

  cacheStore.replaceAll(
    { days, checkins, templates },
    {
      preserveDates: outbox.dirtyDates(),
      preserveTemplateIds: outbox.pendingTemplateIds(),
    },
  );
}

let initialized = false;

export function initSync() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // Cheap hedge against the browser evicting localStorage (and with it an
  // unflushed outbox) while the device sits offline.
  navigator.storage?.persist?.().catch(() => {});

  // Every enqueue tries to flush immediately; offline attempts classify
  // themselves as blocked and wait for the next trigger.
  outbox.subscribe(requestFlush);
  window.addEventListener("online", requestFlush);
  // The trigger that actually fires when a phone comes back out of a pocket
  // at the gym.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") requestFlush();
  });
  supabase.auth.onAuthStateChange((event) => {
    if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") requestFlush();
  });
  requestFlush();
}
