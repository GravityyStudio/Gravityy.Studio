import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./supabase/env";

/** Social sign-in options, in display order. Ids are Supabase provider names. */
export const SOCIAL = [
  { id: "google", label: "Google" },
  { id: "linkedin_oidc", label: "LinkedIn" },
  { id: "github", label: "GitHub" },
] as const;
export type SocialId = (typeof SOCIAL)[number]["id"];

/**
 * Providers switched on in Supabase (Auth → Providers), read from the public /auth/v1/settings endpoint and
 * cached 5 minutes. Only these get a button, so visitors never see a sign-in option that would fail.
 */
export async function enabledSocial(): Promise<SocialId[]> {
  if (!supabaseConfigured) return [];
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/settings`, { headers: { apikey: SUPABASE_ANON_KEY }, next: { revalidate: 300 } });
    const external = ((await res.json()) as { external?: Record<string, boolean> }).external ?? {};
    return SOCIAL.filter((p) => external[p.id]).map((p) => p.id);
  } catch {
    return [];
  }
}
