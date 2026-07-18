// Effort is stored canonically as RPE (5.0–10.0 in 0.5 steps). RIR is a
// lossless display preference: RIR = 10 − RPE.

const STORAGE_KEY = "effort-scale";

export function clampRpe(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  const snapped = Math.round(n * 2) / 2;
  return Math.min(10, Math.max(5, snapped));
}

export function getEffortScale() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "rir" ? "rir" : "rpe";
  } catch {
    return "rpe";
  }
}

export function setEffortScale(scale) {
  try {
    localStorage.setItem(STORAGE_KEY, scale === "rir" ? "rir" : "rpe");
  } catch {
    // display preference only; losing it is harmless
  }
}

export function rpeToDisplay(rpe, scale) {
  if (rpe == null) return null;
  return scale === "rir" ? Math.round((10 - rpe) * 2) / 2 : rpe;
}

export function displayToRpe(value, scale) {
  if (value == null || value === "") return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return clampRpe(scale === "rir" ? 10 - n : n);
}
