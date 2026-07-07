import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Env is injected by Lovable / Vite as VITE_*. Different Lovable/Supabase setups
// name the public key differently (ANON_KEY vs PUBLISHABLE_KEY), so accept any of
// them. When nothing is set, the app shows a setup screen instead of crashing.
const env = import.meta.env as Record<string, string | undefined>;

const url = env.VITE_SUPABASE_URL;
const publicKey =
  env.VITE_SUPABASE_ANON_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  env.VITE_SUPABASE_KEY;

export const isSupabaseConfigured = Boolean(url && publicKey);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(url!, publicKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
