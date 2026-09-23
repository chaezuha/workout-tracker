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

// libadwaita 1.6 accent colors; blue is the default. The CSS for each lives
// in index.css ([data-accent=…] on <html>), and the inline script in
// index.html applies the stored one before first paint.
export const ACCENT_KEY = "accent";
export const ACCENTS = [
  { value: "blue", label: "Blue", color: "#3584e4" },
  { value: "teal", label: "Teal", color: "#2190a4" },
  { value: "green", label: "Green", color: "#3a944a" },
  { value: "yellow", label: "Yellow", color: "#c88800" },
  { value: "orange", label: "Orange", color: "#ed5b00" },
  { value: "red", label: "Red", color: "#e62d42" },
  { value: "pink", label: "Pink", color: "#d56199" },
  { value: "purple", label: "Purple", color: "#9141ac" },
  { value: "slate", label: "Slate", color: "#6f8396" },
];

export function resolveAccent(stored) {
  return ACCENTS.some((a) => a.value === stored) ? stored : "blue";
}
