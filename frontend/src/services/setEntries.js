// Canonical per-set data. An exercise's setEntries is the source of truth
// when present:
//
//   { weight:     number | null   — null = bodyweight/unknown
//     targetReps: positive int    — planned reps
//     reps:       positive int | null — logged reps; null = not logged
//     type:       "warmup" | "working" | "drop"
//     rpe:        number | null   — 5.0–10.0 in 0.5 steps }
//
// setEntries null/undefined marks a legacy exercise (single weight + a
// completedReps array) and is synthesized on read; an empty array is
// canonical ("no sets planned") and never re-synthesized. The legacy fields
// (weight/sets/reps/completedReps) are always re-derived on save so old
// readers stay operable — a single derived weight can't represent mixed
// per-set weights exactly, but every aggregate over purely legacy data is
// unchanged.

import { clampRpe } from "@/lib/effort";

export const SET_TYPES = ["warmup", "working", "drop"];

function toPositiveInt(value) {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : null;
}

// "" and legacy empty weights map to null (bodyweight/unknown).
export function toWeight(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function sanitizeEntry(raw = {}) {
  return {
    weight: toWeight(raw.weight),
    targetReps: toPositiveInt(raw.targetReps) ?? 1,
    reps: toPositiveInt(raw.reps),
    type: SET_TYPES.includes(raw.type) ? raw.type : "working",
    rpe: raw.rpe == null || raw.rpe === "" ? null : clampRpe(raw.rpe),
  };
}

export function makeEntries(count, { weight = null, targetReps = 1 } = {}) {
  const n = toPositiveInt(count) ?? 0;
  return Array.from({ length: n }, () =>
    sanitizeEntry({ weight, targetReps }),
  );
}

// Legacy → entries, matching loggedReps semantics exactly: completedReps
// values are capped at the planned set count and only values > 0 count as
// logged.
function synthesizeFromLegacy(exercise) {
  const count = toPositiveInt(exercise.sets) ?? 0;
  const weight = toWeight(exercise.weight);
  const targetReps = toPositiveInt(exercise.reps) ?? 1;
  const completed = exercise.completedReps ?? [];
  return Array.from({ length: count }, (_, i) => ({
    weight,
    targetReps,
    reps: toPositiveInt(completed[i]),
    type: "working",
    rpe: null,
  }));
}

// Modal targetReps among working sets; ties go to the earliest working set
// whose target is one of the tied values. No working sets → first entry.
function modalTargetReps(entries) {
  const working = entries.filter((en) => en.type === "working");
  const pool = working.length ? working : entries;
  if (!pool.length) return 0;
  const counts = new Map();
  for (const en of pool) {
    counts.set(en.targetReps, (counts.get(en.targetReps) ?? 0) + 1);
  }
  const top = Math.max(...counts.values());
  return pool.find((en) => counts.get(en.targetReps) === top).targetReps;
}

// The legacy columns re-derived from entries. `weight` is the heaviest
// working/drop-set weight (warm-ups can't inflate it); completedReps is
// full-length with 0 marking unlogged sets, which loggedReps() filters out.
export function deriveLegacyFields(entries) {
  const scoring = entries.filter((en) => en.type !== "warmup");
  const weights = (scoring.length ? scoring : entries)
    .map((en) => en.weight)
    .filter((w) => w != null);
  return {
    weight: weights.length ? Math.max(...weights) : null,
    sets: entries.length,
    reps: modalTargetReps(entries),
    completedReps: entries.map((en) => en.reps ?? 0),
  };
}

// New-code saves always re-derive the legacy columns, so a disagreement
// means the row was last written by a client that predates setEntries (old
// cached PWA builds linger until the update prompt is accepted). The legacy
// edit wins: setEntries is dropped and re-synthesized.
function legacyFieldsDisagree(exercise, entries) {
  const derived = deriveLegacyFields(entries);
  if ((toPositiveInt(exercise.sets) ?? 0) !== derived.sets) return true;
  if ((toPositiveInt(exercise.reps) ?? 0) !== derived.reps) return true;
  if (toWeight(exercise.weight) !== derived.weight) return true;
  const completed = exercise.completedReps ?? [];
  const len = Math.max(completed.length, derived.completedReps.length);
  for (let i = 0; i < len; i++) {
    if ((toPositiveInt(completed[i]) ?? 0) !== (derived.completedReps[i] ?? 0)) {
      return true;
    }
  }
  return false;
}

// The single normalization choke point: every ingress (server rows, local
// reads, new/imported/template exercises) runs through here so the rest of
// the app only ever sees exercises with setEntries.
export function normalizeExercise(exercise) {
  if (!Array.isArray(exercise.setEntries)) {
    return { ...exercise, setEntries: synthesizeFromLegacy(exercise) };
  }
  const entries = exercise.setEntries.map(sanitizeEntry);
  if (legacyFieldsDisagree(exercise, entries)) {
    return { ...exercise, setEntries: synthesizeFromLegacy(exercise) };
  }
  return { ...exercise, setEntries: entries };
}

export function normalizeSessions(sessions) {
  return (sessions ?? []).map((s) => ({
    ...s,
    exercises: (s.exercises ?? []).map(normalizeExercise),
  }));
}

// CSV import: parses the setEntries cell. Returns sanitized entries or
// throws with a message suitable for the per-line error list.
export function parseSetEntriesJson(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("setEntries is not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.some((en) => typeof en !== "object" || en == null)) {
    throw new Error("setEntries must be a JSON array of set objects");
  }
  return parsed.map(sanitizeEntry);
}

// Card summary. Reads like the old "135 lb · 3 sets × 8 reps" while the
// plan is uniform and unlogged; switches to per-set reps once logging
// starts; spells out every set when weights or types vary.
export function summarizeEntries(entries) {
  if (!entries?.length) return "No sets";
  const first = entries[0];
  const uniformWeight = entries.every((en) => en.weight === first.weight);
  const allWorking = entries.every((en) => en.type === "working");
  const anyLogged = entries.some((en) => en.reps != null);
  const uniformTarget = entries.every((en) => en.targetReps === first.targetReps);
  const weightPrefix = (sep) =>
    first.weight == null ? "" : `${first.weight} lb ${sep} `;

  if (uniformWeight && allWorking && uniformTarget && !anyLogged) {
    return `${weightPrefix("·")}${entries.length} sets × ${first.targetReps} reps`;
  }
  if (uniformWeight && allWorking) {
    return `${weightPrefix("×")}${entries.map((en) => en.reps ?? "–").join("/")}`;
  }
  const tag = (t) => (t === "warmup" ? " (W)" : t === "drop" ? " (D)" : "");
  return entries
    .map(
      (en) =>
        `${en.weight == null ? "BW" : en.weight}×${en.reps ?? en.targetReps}${tag(en.type)}`,
    )
    .join(", ");
}
