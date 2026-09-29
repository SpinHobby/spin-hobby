// The browser talks to exactly one backend: the Spin Hobby API (NestJS).
// Set VITE_API_URL at build time (Netlify); local development defaults to the dev server.

import type { AppUser } from "../v3/types";

export const API_URL: string = (import.meta.env.VITE_API_URL || "http://localhost:8080").replace(/\/$/, "");

export type ApiRequest = RequestInit & { body?: BodyInit | null };

// ---------------------------------------------------------------- session

export interface Session { accessToken: string; refreshToken: string; expiresAt: number; user: AppUser }
const SESSION_KEY = "spinhobby-session";
const listeners = new Set<(s: Session | null) => void>();

function readSession(): Session | null {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? "null"); } catch { return null; }
}
let session: Session | null = typeof window === "undefined" ? null : readSession();

function setSession(next: Session | null) {
  session = next;
  try {
    if (next) localStorage.setItem(SESSION_KEY, JSON.stringify(next));
    else localStorage.removeItem(SESSION_KEY);
  } catch { /* storage blocked */ }
  listeners.forEach((fn) => fn(next));
}

export function getSession() { return session; }

export function onSessionChange(fn: (s: Session | null) => void) {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}

// Another tab signed in or out.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => { if (e.key === SESSION_KEY) { session = readSession(); listeners.forEach((fn) => fn(session)); } });
}

let refreshing: Promise<Session | null> | null = null;
function refreshSession(): Promise<Session | null> {
  const current = session;
  if (!current) return Promise.resolve(null);
  refreshing ??= request<Session>("/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: current.refreshToken }) }, null)
    .then((next) => { setSession(next); return next; })
    .catch(() => { setSession(null); return null; })
    .finally(() => { refreshing = null; });
  return refreshing;
}

/** A token that is valid for at least another minute (refreshing if needed). */
async function accessToken() {
  if (!session) return null;
  if (session.expiresAt * 1000 - Date.now() < 60_000) return (await refreshSession())?.accessToken ?? null;
  return session.accessToken;
}

// ---------------------------------------------------------------- requests

async function request<T>(path: string, init: ApiRequest, token: string | null): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { ...init, headers });
  } catch {
    throw Object.assign(new Error("Can't reach the shop server. Check your connection and try again."), { status: 0 });
  }
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw Object.assign(new Error(payload.error ?? "The request could not be completed."), { status: response.status, payload });
  }
  return payload as T;
}

export async function api<T>(path: string, init: ApiRequest = {}): Promise<T> {
  const token = await accessToken();
  try {
    return await request<T>(path, init, token);
  } catch (error) {
    // Token revoked or expired early: refresh once and retry.
    if ((error as { status?: number }).status === 401 && token) {
      const next = await refreshSession();
      if (next) return request<T>(path, init, next.accessToken);
    }
    throw error;
  }
}

// ---------------------------------------------------------------- sign-in

export type OAuthProvider = "google" | "discord";
export interface AuthProviders { password: boolean; google: boolean; discord: boolean; dev?: boolean }

let providersPromise: Promise<AuthProviders> | null = null;
export function authProviders(): Promise<AuthProviders> {
  providersPromise ??= request<AuthProviders>("/auth/providers", {}, null).catch(() => ({ password: true, google: false, discord: false }));
  return providersPromise;
}

export async function signInWithPassword(email: string, password: string) {
  setSession(await request<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }, null));
}

/** Sends the browser to Google/Discord; it comes back to the same page (see completeOAuthRedirect). */
export async function signIn(provider: OAuthProvider, returnPath = window.location.pathname) {
  const { url } = await request<{ url: string }>(`/auth/oauth-url?provider=${provider}&redirectTo=${encodeURIComponent(window.location.origin + returnPath)}`, {}, null);
  window.location.assign(url);
}

/** After Google/Discord, Supabase returns tokens in the URL hash. Turn them into a session. */
export async function completeOAuthRedirect() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const access = hash.get("access_token");
  const refresh = hash.get("refresh_token");
  if (!access || !refresh) return;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  const me = await request<{ user: AppUser }>("/auth/me", {}, access).catch(() => null);
  if (me) setSession({ accessToken: access, refreshToken: refresh, expiresAt: Number(hash.get("expires_at") ?? Math.floor(Date.now() / 1000) + 3600), user: me.user });
}

export async function signOut() {
  const token = session?.accessToken;
  setSession(null);
  if (token) await request("/auth/logout", { method: "POST" }, token).catch(() => undefined);
}
