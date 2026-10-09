// The browser talks to exactly one backend: the Spin Hobby API (NestJS).
// Set VITE_API_URL at build time to override; see DEFAULT_API below.

import type { AppUser } from "../v3/types";

// Production builds default to the Render service; override with VITE_API_URL (e.g. a custom api.spinhobby.com).
const DEFAULT_API = import.meta.env.PROD ? "https://spin-hobby-server.onrender.com" : "http://localhost:8080";
export const API_URL: string = (import.meta.env.VITE_API_URL || DEFAULT_API).replace(/\/$/, "");

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
  // A FormData body sets its own Content-Type (with the multipart boundary).
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
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

/** Fetches a file from the API as a Blob (a photo for the editor), signed in like any other request. */
export async function apiBlob(path: string): Promise<Blob> {
  const token = await accessToken();
  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  } catch {
    throw new Error("Can't reach the shop server. Check your connection and try again.");
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.error ?? "That photo could not be loaded.");
  }
  return response.blob();
}

// ---------------------------------------------------------------- sign-in

export type OAuthProvider = "google" | "discord";
/** `username`: the email box also accepts the staging admin username (staging site only). */
export interface AuthProviders { password: boolean; signup?: boolean; google: boolean; discord: boolean; dev?: boolean; username?: boolean }

let providersPromise: Promise<AuthProviders> | null = null;
export function authProviders(): Promise<AuthProviders> {
  providersPromise ??= request<AuthProviders>("/auth/providers", {}, null).catch(() => ({ password: true, google: false, discord: false }));
  return providersPromise;
}

export async function signInWithPassword(email: string, password: string) {
  setSession(await request<Session>("/auth/login", { method: "POST", body: JSON.stringify({ email: email.trim(), password }) }, null));
}

/** Creates a customer account (no confirmation email) and signs straight in. */
// Set by a fresh sign-up so the welcome message can say "welcome" rather than "welcome back".
let justSignedUp = false;
export function consumeSignupFlag() { const v = justSignedUp; justSignedUp = false; return v; }

export async function signUpWithPassword(email: string, password: string, firstName?: string) {
  justSignedUp = true;
  setSession(await request<Session>("/auth/signup", { method: "POST", body: JSON.stringify({ email: email.trim(), password, firstName: firstName?.trim() || undefined }) }, null));
}

/** Sends the browser to Google/Discord; it comes back to the same page (see completeOAuthRedirect). */
export async function signIn(provider: OAuthProvider, returnPath = window.location.pathname) {
  const { url } = await request<{ url: string }>(`/auth/oauth-url?provider=${provider}&redirectTo=${encodeURIComponent(window.location.origin + returnPath)}`, {}, null);
  window.location.assign(url);
}

export interface AuthRedirectResult { type: string | null; error: string | null }

/**
 * After Google/Discord, or after a password-recovery email link, Supabase returns tokens (or an
 * error) in the URL hash. Turns a success into a session; always reports what happened so callers
 * that care (the reset-password page) can react — e.g. an expired recovery link.
 */
export async function completeOAuthRedirect(): Promise<AuthRedirectResult | null> {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  const access = hash.get("access_token");
  const refresh = hash.get("refresh_token");
  const type = hash.get("type");
  const error = hash.get("error_description") ?? hash.get("error_code") ?? hash.get("error");
  if (!access || !refresh) return error ? { type, error } : null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  const me = await request<{ user: AppUser }>("/auth/me", {}, access).catch(() => null);
  if (!me) return { type, error: "Your session could not be loaded." };
  setSession({ accessToken: access, refreshToken: refresh, expiresAt: Number(hash.get("expires_at") ?? Math.floor(Date.now() / 1000) + 3600), user: me.user });
  return { type, error: null };
}

/** Requests a password-reset email; always resolves, even for an unknown address. */
export async function requestPasswordReset(email: string, redirectTo: string) {
  await request("/auth/reset", { method: "POST", body: JSON.stringify({ email: email.trim(), redirectTo }) }, null);
}

/** Sets a new password for the signed-in caller (a normal session or a temporary recovery one). */
export async function updatePassword(password: string) {
  await api("/auth/password", { method: "POST", body: JSON.stringify({ password }) });
}

/** True when this page was opened from a password-reset email (its tokens are still in the URL). */
export function isRecoveryLink() {
  return new URLSearchParams(window.location.hash.slice(1)).get("type") === "recovery";
}

export async function signOut() {
  const token = session?.accessToken;
  setSession(null);
  if (token) await request("/auth/logout", { method: "POST" }, token).catch(() => undefined);
}
