import { createClient } from "@supabase/supabase-js";

// These values identify the public Supabase project. They are safe to ship in a
// browser bundle; authorization is enforced by Supabase Auth and row-level security.
export const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ?? "https://zmlltsytckexrmybvnof.supabase.co";

export const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  "sb_publishable_tStjaCxjQZrh2_BG7h6i6g_F3c3wx9d";

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
