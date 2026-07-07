import { useEffect, useState } from "react";
import { nextTheme, resolveTheme, THEME_COLORS, THEME_KEY } from "@/lib/theme";

const DARK_QUERY = "(prefers-color-scheme: dark)";

// Resolved light/dark theme plus a toggle. The inline script in index.html
// already applied the right class before first paint; this hook keeps the
// class, the stored choice, and the theme-color metas in sync afterwards
// (including live OS switches while no explicit choice is stored).
export function useTheme() {
  const [stored, setStored] = useState(() => localStorage.getItem(THEME_KEY));
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia(DARK_QUERY).matches,
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

  const toggle = () => {
    const next = nextTheme(resolvedTheme);
    localStorage.setItem(THEME_KEY, next);
    setStored(next);
  };

  return { resolvedTheme, toggle };
}
