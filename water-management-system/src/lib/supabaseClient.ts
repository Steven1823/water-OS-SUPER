import { createClient } from "@supabase/supabase-js";

const configuredSupabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ?? "";
const configuredSupabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ?? "";

export const hasSupabaseConfig = Boolean(configuredSupabaseUrl && configuredSupabaseAnonKey);

// Keep app boot stable even when deployment env vars are missing.
const fallbackSupabaseUrl = "https://placeholder.supabase.co";
const fallbackSupabaseAnonKey = "placeholder-anon-key";

if (!hasSupabaseConfig) {
  console.warn(
    "Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Configure them in your host (e.g. Vercel Project Settings -> Environment Variables)."
  );
}

export const supabase = createClient(
  hasSupabaseConfig ? configuredSupabaseUrl : fallbackSupabaseUrl,
  hasSupabaseConfig ? configuredSupabaseAnonKey : fallbackSupabaseAnonKey
);
