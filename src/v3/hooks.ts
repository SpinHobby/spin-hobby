import { useCallback, useEffect, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { api } from "../lib/api";
import { supabase } from "../lib/supabase";
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

/** Supabase session + the app profile (role) from /auth/me. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    const load = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next) { setUser(null); setReady(true); return; }
      try {
        const me = await api<{ user: AppUser }>("/auth/me");
        if (active) setUser(me.user);
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setReady(true);
      }
    };
    supabase.auth.getSession().then(({ data }) => load(data.session));
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") load(next);
    });
    return () => { active = false; data.subscription.unsubscribe(); };
  }, []);

  const signOut = useCallback(() => supabase.auth.signOut(), []);
  return { session, user, email: session?.user.email ?? null, ready, signOut };
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

/** Demo data is only allowed locally or when explicitly enabled for a preview deploy. */
export const DEMO_ALLOWED = import.meta.env.DEV || import.meta.env.VITE_DEMO_DATA === "true";
