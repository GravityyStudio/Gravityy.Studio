"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Result } from "@/app/admin/actions";

const TYPES = /^(image\/(jpeg|png|webp|avif|gif|svg\+xml)|video\/(mp4|webm))$/;
const MAX = 10 * 1024 * 1024; // matches the bucket's file_size_limit

/** Uploads into the public `media` bucket. Storage RLS: admins only. Names are slugged + timestamped (no overwrites). */
export async function uploadMedia(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const files = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { error: "Choose at least one file." };
  for (const f of files) {
    if (!TYPES.test(f.type)) return { error: `${f.name}: use JPG, PNG, WebP, AVIF, GIF, SVG, MP4 or WebM.` };
    if (f.size > MAX) return { error: `${f.name}: files must be 10 MB or smaller.` };
    const dot = f.name.lastIndexOf(".");
    const base = (dot > 0 ? f.name.slice(0, dot) : f.name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "file";
    const path = `${Date.now().toString(36)}-${base}${dot > 0 ? f.name.slice(dot).toLowerCase() : ""}`;
    const { error } = await supabase.storage.from("media").upload(path, f, { contentType: f.type, cacheControl: "31536000", upsert: false });
    if (error) return { error: `${f.name}: ${error.message}` };
    await audit(supabase, user, "upload", "media", path, { size: f.size, type: f.type });
  }
  revalidatePath("/admin/cms/media");
  return { ok: true };
}

export async function deleteMedia(_: Result, form: FormData): Promise<Result> {
  const { supabase, user } = await requireAdmin();
  const name = String(form.get("name") ?? "");
  if (!/^[\w.-]+$/.test(name)) return { error: "Invalid file." };
  const { error } = await supabase.storage.from("media").remove([name]);
  if (error) return { error: error.message };
  await audit(supabase, user, "delete", "media", name);
  revalidatePath("/admin/cms/media");
  return { ok: true };
}
