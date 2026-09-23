import { useEffect, useState } from "react";
import { ACCENT_KEY, resolveAccent, resolveTheme, THEME_COLORS, THEME_KEY } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// Resolved light/dark theme plus the stored preference ("system" when
// nothing is stored) and a setter for the main menu's style switcher, and
// the accent color with its setter. The inline script in index.html
// already applied the right class before first paint; this hook keeps the
// class, the stored choice, and the theme-color metas in sync afterwards
// (including live OS switches while no explicit choice is stored).
export function useTheme() {
  const [stored, setStored] = useState(() => localStorage.getItem(THEME_KEY));
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
  );

  const [accent, setAccentState] = useState(() =>
    resolveAccent(localStorage.getItem(ACCENT_KEY)),
  );

  const resolvedTheme = resolveTheme(stored, systemDark);

  useEffect(() => {
    const query = window.matchMedia(DARK_QUERY);
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", resolvedTheme === "dark");
    // With an explicit choice both media-scoped metas get the same color so
    // the browser's pick no longer matters; unset restores the defaults.
    for (const meta of document.querySelectorAll('meta[name="theme-color"]')) {
      const defaultTheme = meta.media?.includes("dark") ? "dark" : "light";
      meta.content = THEME_COLORS[stored ? resolvedTheme : defaultTheme];
    }
  }, [resolvedTheme, stored]);

  const setTheme = (next) => {
    if (next === "light" || next === "dark") {
      localStorage.setItem(THEME_KEY, next);
      setStored(next);
    } else {
      localStorage.removeItem(THEME_KEY);
      setStored(null);
    }
  };

  useEffect(() => {
    if (accent === "blue") delete document.documentElement.dataset.accent;
    else document.documentElement.dataset.accent = accent;
  }, [accent]);

  const setAccent = (next) => {
    const value = resolveAccent(next);
    if (value === "blue") localStorage.removeItem(ACCENT_KEY);
    else localStorage.setItem(ACCENT_KEY, value);
    setAccentState(value);
  };

  const theme = stored === "light" || stored === "dark" ? stored : "system";

  return { resolvedTheme, theme, setTheme, accent, setAccent };
}
