import { useCallback, useEffect, useState } from "react";
import { api, completeOAuthRedirect, getSession, onSessionChange, signOut, type Session } from "../lib/api";
import type { AppUser } from "./types";

// general-purpose hooks live with the shared components; kept importable from here for the existing pages
export { useEscape, useTheme, useToast, type Theme } from "../components/hooks";

/** Signed-in account (from the API session) + its role. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(getSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const off = onSessionChange(setSession);
    // Finish a Google/Discord sign-in, then confirm the stored session is still valid.
    completeOAuthRedirect()
      .then(() =>
        getSession()
          ? api<{ user: AppUser }>("/auth/me")
              .then(() => undefined)
              .catch(() => undefined)
          : undefined,
      )
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
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage blocked */
    }
  }, [key, value]);
  return [value, setValue] as const;
}
