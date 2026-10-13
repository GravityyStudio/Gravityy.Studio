import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/safe-next";

// Email-confirmation and social sign-in (OAuth PKCE) target: exchange the one-time code for a session cookie, then continue.
export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const next = safeNext(url.searchParams.get("next"));
  if (code) {
    const supabase = await createSupabaseServer();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  // Provider sent the visitor back without a code (cancelled / denied) vs. a stale email link.
  const reason = url.searchParams.has("error") ? "oauth" : "confirm";
  return NextResponse.redirect(new URL(`/login?error=${reason}&next=${encodeURIComponent(next)}`, url.origin));
}
