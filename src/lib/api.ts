import { supabase, supabaseUrl, supabasePublishableKey } from "./supabase";

const apiBase =
  import.meta.env.VITE_STORE_API_BASE ??
  `${supabaseUrl}/functions/v1/store-api`;

export type ApiRequest = RequestInit & { body?: BodyInit | null };

export async function api<T>(path: string, init: ApiRequest = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (session?.access_token) {
    headers.set("Authorization", `Bearer ${session.access_token}`);
  }

  const response = await fetch(`${apiBase}${path}`, { ...init, headers });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload.success === false) {
    throw new Error(payload.error ?? "The request could not be completed.");
  }
  return payload as T;
}

export type OAuthProvider = "google" | "discord";

/** Sends the user to the provider, then back to the page they started on (e.g. /admin). */
export async function signIn(provider: OAuthProvider, returnPath = window.location.pathname) {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin + returnPath },
  });
  if (error) throw error;
}

/** Passwordless sign-in: emails a one-time link (and code, if the email template includes it). */
export async function sendEmailLink(email: string, returnPath = window.location.pathname) {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim().toLowerCase(),
    options: { emailRedirectTo: window.location.origin + returnPath, shouldCreateUser: true },
  });
  if (error) throw error;
}

export async function verifyEmailCode(email: string, token: string) {
  const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: token.trim(), type: "email" });
  if (error) throw error;
}

export interface AuthProviders { email: boolean; google: boolean; discord: boolean }

let providersPromise: Promise<AuthProviders> | null = null;
/** Reads which sign-in methods are switched on in Supabase Auth (public endpoint). */
export function authProviders(): Promise<AuthProviders> {
  providersPromise ??= fetch(`${supabaseUrl}/auth/v1/settings`, { headers: { apikey: supabasePublishableKey } })
    .then((r) => r.json())
    .then((d) => ({ email: !!d.external?.email, google: !!d.external?.google, discord: !!d.external?.discord }))
    .catch(() => ({ email: true, google: true, discord: true }));
  return providersPromise;
}
