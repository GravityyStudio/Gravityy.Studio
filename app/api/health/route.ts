import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL } from "@/lib/supabase/env";

// Never cached: reflects the running deployment's configuration.
export const dynamic = "force-dynamic";

const opts = { auth: { persistSession: false } };

/**
 * Deployment self-check for setup debugging. Reports only booleans and Supabase's error text: no key values.
 * `public`: the anon/publishable key reads the CMS. `service`: the service-role key can reach the database
 * (needed for leads from the site forms and payment webhooks).
 */
export async function GET() {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const out: Record<string, unknown> = {
    supabaseUrlSet: Boolean(SUPABASE_URL),
    projectRef: SUPABASE_URL.match(/^https:\/\/([a-z0-9]+)\.supabase\.co/)?.[1] ?? null, // which Supabase project this deployment talks to
    serviceKeySet: Boolean(serviceKey),
  };

  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    const { error } = await createClient(SUPABASE_URL, SUPABASE_ANON_KEY, opts).rpc("cms_published_all");
    out.public = error ? { ok: false, error: error.message } : { ok: true };
  }
  if (SUPABASE_URL && serviceKey) {
    const { error } = await createClient(SUPABASE_URL, serviceKey, opts).from("leads").select("id", { head: true, count: "exact" });
    out.service = error ? { ok: false, error: error.message } : { ok: true };
  }
  return NextResponse.json(out, { headers: { "Cache-Control": "no-store" } });
}
