import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabaseServer } from "./supabase/server";
import { supabaseConfigured } from "./supabase/env";
import { safeNext } from "./safe-next";

export type Profile = { id: string; email: string; full_name: string; role: "client" | "admin"; region: "IN" | "GLOBAL"; created_at: string };

/** Current user + profile (RLS: a user can only read their own profile row). Null when signed out / unconfigured.
 *  Cached per request, so a layout and its page share one auth round trip. */
export const getViewer = cache(async () => {
  if (!supabaseConfigured) return null;
  const supabase = await createSupabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single<Profile>();
  return { supabase, user, profile: profile ?? ({ id: user.id, email: user.email ?? "", full_name: "", role: "client", region: "IN", created_at: "" } as Profile) };
});

/** Server Components / actions: signed-in users only (the proxy already redirects; this is defence in depth). */
export async function requireUser(next = "/portal") {
  const viewer = await getViewer();
  if (!viewer) redirect(`/login?next=${encodeURIComponent(safeNext(next))}`);
  return viewer;
}

/** RBAC: admin role from public.profiles. Writes are additionally enforced by RLS (is_admin()). */
export async function requireAdmin() {
  const viewer = await requireUser("/admin");
  if (viewer.profile.role !== "admin") redirect("/portal?denied=admin");
  return viewer;
}
