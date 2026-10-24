// Supabase browser client for account auth only (email + password).
//
// PRIVACY: this client handles the account (email/password/session) and nothing
// else. The Legible profile — name, town, life facts, and topics — stays in the
// browser's localStorage and is NEVER sent to Supabase. Do not pass profile data
// to any call made with this client.
//
// The publishable (anon) key is designed to be exposed to the browser, so it
// uses a NEXT_PUBLIC_ var. It still lives in .env.local, not in source.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * The shared client, or null when the env vars are not set (so the app runs and
 * the auth UI can show a clear "not configured" state instead of crashing).
 */
export const supabase: SupabaseClient | null =
  url && anonKey
    ? createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const authConfigured = supabase !== null;
