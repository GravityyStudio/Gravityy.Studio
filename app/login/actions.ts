"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServer } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/env";
import { safeNext } from "@/lib/safe-next";
import { SITE } from "@/lib/seo";
import { SOCIAL, enabledSocial, type SocialId } from "@/lib/auth-providers";

export type AuthState = { error?: string; message?: string };

const creds = z.object({
  email: z.string().trim().email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
  full_name: z.string().trim().max(120).optional(),
  next: z.string().optional(),
});

/** Supabase Auth (email + password; social sign-in below). Session lands in httpOnly JWT cookies via @supabase/ssr. */
export async function authenticate(mode: "signin" | "signup", _: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: "Sign-in isn't configured yet (Supabase keys missing)." };
  const parsed = creds.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { email, password, full_name, next } = parsed.data;
  const supabase = await createSupabaseServer();

  if (mode === "signin") {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message === "Invalid login credentials" ? "Wrong email or password." : error.message };
  } else {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: full_name ?? "" }, emailRedirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
    });
    if (error) return { error: error.message };
    // Email confirmation enabled in Supabase → no session yet.
    if (!data.session) return { message: `Check ${email} to confirm your account, then sign in.` };
  }
  redirect(safeNext(next));
}

export async function signOut() {
  if (supabaseConfigured) await (await createSupabaseServer()).auth.signOut();
  redirect("/login");
}

const social = z.object({ provider: z.enum(SOCIAL.map((p) => p.id) as [SocialId, ...SocialId[]]), next: z.string().optional() });

/** Social sign-in (PKCE): Supabase returns the provider's consent URL; /auth/callback exchanges the code for a session. */
export async function oauthSignIn(_: AuthState, form: FormData): Promise<AuthState> {
  if (!supabaseConfigured) return { error: "Sign-in isn't configured yet (Supabase keys missing)." };
  const parsed = social.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Unknown sign-in option." };
  const { provider, next } = parsed.data;
  if (!(await enabledSocial()).includes(provider)) return { error: "That sign-in option isn't available right now." };
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${SITE}/auth/callback?next=${encodeURIComponent(safeNext(next))}` },
  });
  if (error || !data.url) return { error: error?.message ?? "Couldn't reach the sign-in provider. Try again." };
  redirect(data.url);
}
