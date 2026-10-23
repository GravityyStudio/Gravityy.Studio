import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL } from "./env";
import type { Database } from "./database.types";

/**
 * Service-role client: bypasses RLS. ONLY for trusted server code with no user session: signature-verified
 * webhooks, site-form intake and rate limiting. Never import from a client component. Typed from the live schema.
 */
export function createSupabaseService() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient<Database>(SUPABASE_URL, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
