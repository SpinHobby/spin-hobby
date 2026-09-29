import { useCallback, useEffect, useRef, useState } from "react";
import { api, completeOAuthRedirect, getSession, onSessionChange, signOut, type Session } from "../lib/api";
import type { AppUser } from "./types";

const THEME_KEY = "spinhobby-theme"; // same key the existing app + index.html use

export type Theme = "light" | "dark";

function readTheme(): Theme {
  const attr = document.documentElement.getAttribute("data-theme");
  if (attr === "light" || attr === "dark") return attr;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(readTheme);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* storage blocked */ }
  }, [theme]);
  const toggle = useCallback(() => setTheme((t) => (t === "dark" ? "light" : "dark")), []);
  return { theme, toggle };
}

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

/** Signed-in account (from the API session) + its role. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(getSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const off = onSessionChange(setSession);
    // Finish a Google/Discord sign-in, then confirm the stored session is still valid.
    completeOAuthRedirect()
      .then(() => (getSession() ? api<{ user: AppUser }>("/auth/me").then(() => undefined).catch(() => undefined) : undefined))
      .finally(() => setReady(true));
    return off;
  }, []);

  const doSignOut = useCallback(() => signOut(), []);
  return { session, user: session?.user ?? null, email: session?.user.email ?? null, ready, signOut: doSignOut };
}

export function useLocalState<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch { return initial; }
  });
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage blocked */ }
  }, [key, value]);
  return [value, setValue] as const;
}

export function useEscape(onEscape: (() => void) | null) {
  useEffect(() => {
    if (!onEscape) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onEscape(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
}
