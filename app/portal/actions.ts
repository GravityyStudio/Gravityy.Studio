"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { REGION_COOKIE, formatMinor } from "@/lib/billing";

const schema = z.object({ full_name: z.string().trim().max(120), region: z.enum(["IN", "GLOBAL"]) });

/** Own profile only: RLS ("update own or admin") + the guard_profile_role trigger stop role changes. */
export type ProfileState = { ok?: boolean; error?: string };

export async function updateProfile(_: ProfileState, form: FormData): Promise<ProfileState> {
  const { supabase, user } = await requireUser();
  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Check the form." };
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", user.id);
  if (error) return { error: error.message };
  // Billing region also drives which plans + payment provider you see.
  (await cookies()).set(REGION_COOKIE, parsed.data.region, { path: "/", maxAge: 60 * 60 * 24 * 30, sameSite: "lax" });
  revalidatePath("/portal", "layout");
  return { ok: true };
}

const ticketSchema = z.object({
  subject: z.string().trim().min(3, "Add a short subject.").max(160),
  body: z.string().trim().max(5000),
  kind: z.enum(["support", "request"]),
  priority: z.enum(["low", "normal", "high", "urgent"]),
  service: z.string().trim().max(120).optional(),
});

/** Client opens a ticket. RLS forces client_id = self, status 'open' and no staff response. */
export async function createTicket(_: ProfileState, form: FormData): Promise<ProfileState> {
  const { supabase, user } = await requireUser();
  const parsed = ticketSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  const { service, ...t } = parsed.data;
  const body = [service && `Service: ${service}`, t.body].filter(Boolean).join("\n\n") || null;
  const { error } = await supabase.from("tickets").insert({ ...t, body, client_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/portal", "layout");
  return { ok: true };
}

/** "Request" on an add-on → a service request the studio picks up (price comes from the add-ons table, not the browser). */
export async function requestAddon(_: ProfileState, form: FormData): Promise<ProfileState> {
  const { supabase, user } = await requireUser();
  const id = z.string().uuid().safeParse(form.get("addon_id"));
  if (!id.success) return { error: "Unknown add-on." };
  const { data: a } = await supabase.from("addons").select("name, description, price_minor, currency").eq("id", id.data).eq("active", true).maybeSingle<{ name: string; description: string | null; price_minor: number; currency: string }>();
  if (!a) return { error: "That add-on is no longer available." };
  const body = [a.description, `Listed price: ${formatMinor(a.price_minor, a.currency)}`].filter(Boolean).join("\n\n");
  const { error } = await supabase.from("tickets").insert({ subject: `Add-on request: ${a.name}`.slice(0, 160), body, kind: "request", priority: "normal", client_id: user.id });
  if (error) return { error: error.message };
  revalidatePath("/portal", "layout");
  return { ok: true };
}
