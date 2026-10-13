"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { CMS_KEYS, CMS_TAG, LOCAL, type CmsKey } from "@/lib/content";

export type Result = { ok?: boolean; error?: string };

/** Marketing pages are ISR-cached under the `cms` tag: publish → visible on the next request. */
function refreshSite() {
  revalidateTag(CMS_TAG);
  revalidatePath("/", "layout");
}

const isList = (v: unknown) => Array.isArray(v);
const sameShape = (a: unknown, b: unknown) => isList(a) === isList(b) && typeof a === typeof b && a !== null;

function parseJson(value: string): { json?: unknown; error?: string } {
  try {
    return { json: JSON.parse(value) };
  } catch (e) {
    return { error: `Invalid JSON: ${e instanceof Error ? e.message : "parse error"}` };
  }
}

const cmsSchema = z.object({ key: z.enum(CMS_KEYS), value: z.string().min(2), published: z.string().optional() });

/** Raw JSON editor: replaces a whole entry. */
export async function saveCms(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const parsed = cmsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Unknown entry." };
  const { key, value, published } = parsed.data;
  const { json, error: jsonErr } = parseJson(value);
  if (jsonErr) return { error: jsonErr };
  // Shape guard: the site expects the same top-level type as the local default (list vs object).
  if (!sameShape(json, LOCAL[key as CmsKey])) return { error: `“${key}” must be a JSON ${isList(LOCAL[key as CmsKey]) ? "array" : "object"}, like the default.` };
  const { error } = await supabase
    .from("cms_entries")
    .upsert({ key, value: json, published: published === "on", updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await audit(supabase, user, "update", "cms", key, { editor: "json", published: published === "on" });
  refreshSite();
  return { ok: true };
}

const partSchema = z.object({ key: z.enum(CMS_KEYS), part: z.string().max(40).optional(), value: z.string().min(2) });

/**
 * Structured editors (Pages, Theme, Menu, Settings, Case studies…). Merges into the current entry:
 * `part` replaces entry[part]; an object merges top-level keys; a list replaces the list. Publishes.
 */
export async function saveCmsPart(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const parsed = partSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Unknown entry." };
  const { key, part, value } = parsed.data;
  const { json, error: jsonErr } = parseJson(value);
  if (jsonErr) return { error: jsonErr };

  const { data: row } = await supabase.from("cms_entries").select("value").eq("key", key).maybeSingle<{ value: unknown }>();
  const local = LOCAL[key as CmsKey] as unknown;
  const current = (row?.value ?? local) as Record<string, unknown> | unknown[];
  let next: unknown;
  if (part) {
    if (isList(current) || !(part in (local as object))) return { error: "Unknown section." };
    if (!sameShape(json, (local as Record<string, unknown>)[part])) return { error: "That section has the wrong shape." };
    next = { ...(current as object), [part]: json };
  } else if (isList(local)) {
    if (!isList(json)) return { error: "Expected a list." };
    next = json;
  } else {
    if (!sameShape(json, local)) return { error: "Expected an object." };
    next = { ...(current as object), ...(json as object) };
  }

  const { error } = await supabase.from("cms_entries").upsert({ key, value: next, published: true, updated_by: user.id, updated_at: new Date().toISOString() });
  if (error) return { error: error.message };
  await audit(supabase, user, "update", "cms", part ? `${key}.${part}` : key, { editor: "form" });
  refreshSite();
  return { ok: true };
}

const planSchema = z.object({
  id: z.string().min(1),
  amount: z.coerce.number().positive().max(100_000_000),
  gst: z.coerce.number().min(0).max(99),
  active: z.string().optional(),
});

export async function updatePlan(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const parsed = planSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the values." };
  const { id, amount, gst, active } = parsed.data;
  const patch = { amount_minor: Math.round(amount * 100), gst_rate: gst / 100, active: active === "on" };
  const { error } = await supabase
    .from("plans")
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq("id", id);
  if (error) return { error: error.message };
  await audit(supabase, user, "update", "plans", id, patch);
  refreshSite(); // displayed prices come from plans too
  return { ok: true };
}

const roleSchema = z.object({ user_id: z.string().uuid(), role: z.enum(["client", "admin"]) });

export async function setRole(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const parsed = roleSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: "Invalid request." };
  if (parsed.data.user_id === user.id && parsed.data.role !== "admin") return { error: "You can't remove your own admin access." };
  const { error } = await supabase.from("profiles").update({ role: parsed.data.role }).eq("id", parsed.data.user_id);
  if (error) return { error: error.message };
  await audit(supabase, user, "set_role", "profiles", parsed.data.user_id, { role: parsed.data.role });
  revalidatePath("/admin/clients", "layout");
  return { ok: true };
}
