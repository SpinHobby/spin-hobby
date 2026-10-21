import { useCallback, useEffect, useRef, useState } from "react";

/** A short message shown for a moment (pass `toast` to PanelLayout, call `flash("Saved")`). */
export function useToast(duration = 2200) {
  const [toast, setToast] = useState("");
  const timer = useRef<number>();
  const flash = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setToast(""), duration);
  }, [duration]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return { toast, flash };
}

/** Calls `onEscape` when Escape is pressed (null: not listening). Drawers and dialogs close with it. */
export function useEscape(onEscape: (() => void) | null) {
  useEffect(() => {
    if (!onEscape) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
}

const THEME_KEY = "spinhobby-theme"; // same key the existing app + index.html use

export type Theme = "light" | "dark";

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/** Light or dark, remembered on this device (the ☀/☾ button). */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage blocked */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}
