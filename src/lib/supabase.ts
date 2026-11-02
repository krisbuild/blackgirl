"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Browser Supabase client. Each visitor gets an anonymous account (no login);
 * row-level security keeps every scan and photo private to that account.
 */
let client: SupabaseClient | null = null;

export function supabase(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) throw new Error("Supabase is not configured");
  client = createClient(url, key);
  return client;
}

/** Returns the signed-in user id, creating an anonymous account on first use. */
export async function ensureUser(): Promise<string> {
  const sb = supabase();
  const { data } = await sb.auth.getSession();
  if (data.session?.user) return data.session.user.id;
  const { data: signed, error } = await sb.auth.signInAnonymously();
  if (error || !signed.user) throw new Error(error?.message ?? "Couldn't start your private journal");
  return signed.user.id;
}
