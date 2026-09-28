import { supabase, supabaseUrl } from "./supabase";

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

export async function signIn(provider: "google" | "discord") {
  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: window.location.origin },
  });
  if (error) throw error;
}
