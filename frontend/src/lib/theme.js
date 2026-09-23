// The theme lives in a bare localStorage key (not services/localStore) because
// the inline script in index.html must read it synchronously before first
// paint; no stored value means "follow the OS".
export const THEME_KEY = "theme";

export function resolveTheme(stored, systemPrefersDark) {
  if (stored === "light" || stored === "dark") return stored;
  return systemPrefersDark ? "dark" : "light";
}

// Hex equivalents of --headerbar for the theme-color meta, so the browser
// chrome continues the header bar.
export const THEME_COLORS = { light: "#ffffff", dark: "#2e2e32" };
