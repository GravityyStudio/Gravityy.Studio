"use client";
import { useSyncExternalStore } from "react";

export type Theme = "dark" | "light";
import { THEME_KEY as KEY } from "@/lib/theme";

/** Current theme = class on <html> (set before first paint by the inline script in app/layout.tsx). */
function subscribe(cb: () => void) {
  const mo = new MutationObserver(cb);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => mo.disconnect();
}
const read = (): Theme => (document.documentElement.classList.contains("light") ? "light" : "dark");

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, read, () => "dark" as Theme);
  const setTheme = (t: Theme) => {
    const root = document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {}
  };
  return { theme, setTheme, toggle: () => setTheme(theme === "dark" ? "light" : "dark") };
}
