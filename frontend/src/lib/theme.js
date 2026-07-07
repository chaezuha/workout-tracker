// The theme lives in a bare localStorage key (not services/localStore) because
// the inline script in index.html must read it synchronously before first
// paint; no stored value means "follow the OS".
export const THEME_KEY = "theme";

export function resolveTheme(stored, systemPrefersDark) {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

export function nextTheme(resolved) {
  return resolved === "dark" ? "light" : "dark";
}

// Hex equivalents of --background for the theme-color meta; older Safari
// can't parse oklch() there.
export const THEME_COLORS = { light: "#ffffff", dark: "#0a0a0a" };
