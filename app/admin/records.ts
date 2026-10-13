"use server";
import { revalidatePath, revalidateTag } from "next/cache";
import { z, type ZodTypeAny } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { CMS_TAG } from "@/lib/content";
import { KINDS, RESOURCES, STAGES, parseMilestones, type Field, type Kind } from "@/lib/resources";
import type { Result } from "./actions";

const blank = (v: unknown) => (v === "" || v == null ? null : v);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Field config → zod rule. Empty optional inputs become null; money is entered in major units, stored in minor. */
function rule(f: Field): ZodTypeAny {
  if (f.type === "checkbox") return z.any().transform((v) => v === "on");
  if (f.type === "milestones") return z.string().max(10_000).default("").transform(parseMilestones);
  if (f.type === "number") return z.coerce.number().int().min(f.min ?? 0).max(f.max ?? 1_000_000);
  if (f.type === "money") return z.coerce.number().min(f.required ? 0.01 : 0, "Enter an amount.").max(100_000_000).transform((v) => Math.round(v * 100));
  const s: ZodTypeAny =
    f.type === "select" ? z.enum(f.options as [string, ...string[]])
    : f.type === "client" ? z.string().uuid("Choose a client.")
    : f.type === "date" ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date.")
    : f.type === "email" ? z.string().trim().max(254).regex(EMAIL, "Enter a valid email address.")
    : f.type === "url" ? z.string().trim().max(2000).regex(/^(https:\/\/|\/)\S+$/, "Use an https:// or /path URL.")
    : f.name === "slug" ? z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase words joined by hyphens.")
    : z.string().trim().min(f.required ? 1 : 0, "Required.").max(f.max ?? 20_000);
  return f.required ? s : z.preprocess(blank, s.nullable());
}

const KIND = z.enum(KINDS as [Kind, ...Kind[]]);
const ID = z.string().uuid();

function refresh(kind: Kind) {
  revalidatePath("/admin", "layout");
  revalidatePath("/portal");
  if (kind === "posts" || kind === "addons") revalidateTag(CMS_TAG); // public /blog and /pricing
}

export async function saveRecord(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const kind = KIND.safeParse(form.get("kind"));
  if (!kind.success) return { error: "Unknown record type." };
  const r = RESOURCES[kind.data];
  const parsed = z.object(Object.fromEntries(r.fields.map((f: Field) => [f.name, rule(f)]))).safeParse(Object.fromEntries(form));
  if (!parsed.success) {
    const i = parsed.error.issues[0];
    return { error: `${r.fields.find((f: Field) => f.name === i?.path[0])?.label ?? "Form"}: ${i?.message}` };
  }
  const id = ID.safeParse(form.get("id")).data ?? null;
  const row: Record<string, unknown> = { ...parsed.data, updated_at: new Date().toISOString() };

  if (kind.data === "posts") {
    // Keep the original publish date across edits; clear it when unpublished.
    const prev = id ? (await supabase.from("posts").select("published_at").eq("id", id).maybeSingle<{ published_at: string | null }>()).data : null;
    row.published_at = row.published ? (prev?.published_at ?? new Date().toISOString()) : null;
  }

  const { data, error } = id
    ? await supabase.from(kind.data).update(row).eq("id", id).select("id").single<{ id: string }>()
    : await supabase.from(kind.data).insert(row).select("id").single<{ id: string }>();
  if (error) return { error: error.code === "23505" ? `That ${r.singular} already exists.` : error.message };

  await audit(supabase, user, id ? "update" : "create", kind.data, data.id, { fields: Object.keys(parsed.data) });
  refresh(kind.data);
  return { ok: true };
}

export async function deleteRecord(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const kind = KIND.safeParse(form.get("kind"));
  const id = ID.safeParse(form.get("id"));
  if (!kind.success || !id.success) return { error: "Invalid request." };
  const { error } = await supabase.from(kind.data).delete().eq("id", id.data);
  if (error) return { error: error.message };
  await audit(supabase, user, "delete", kind.data, id.data);
  refresh(kind.data);
  return { ok: true };
}

/** Kanban drop / stage select. */
export async function moveLead(id: string, stage: string): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const p = z.object({ id: ID, stage: z.enum(STAGES) }).safeParse({ id, stage });
  if (!p.success) return { error: "Invalid move." };
  const { error } = await supabase.from("leads").update({ stage: p.data.stage, updated_at: new Date().toISOString() }).eq("id", p.data.id);
  if (error) return { error: error.message };
  await audit(supabase, user, "move", "leads", p.data.id, { stage: p.data.stage });
  revalidatePath("/admin", "layout");
  return { ok: true };
}
