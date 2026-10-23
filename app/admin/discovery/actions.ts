"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import type { Json } from "@/lib/supabase/database.types";
import { CSV_MAX_BYTES, readProspectsCsv } from "@/lib/discovery/csv";
import { prospectInputSchema, splitList, toProspectFields } from "@/lib/discovery/prospect";
import { providerById, SOURCE_POLICIES } from "@/lib/discovery/providers";
import { DEFAULT_SCORING, scoringConfigSchema } from "@/lib/discovery/scoring";
import { addToCrm, analyzeProspect, insertProspects, rescore, runImport, scoringConfig, workspaceId, type NewProspect } from "@/lib/discovery/service";
import type { Finding, Signals } from "@/lib/discovery/analyze";

export type ActionState = { ok?: boolean; error?: string; message?: string };

const ID = z.string().uuid();
const legalBasis = z.string().trim().min(10, "Describe the lawful basis / permission for this data (at least 10 characters).").max(500);
const done = (message: string): ActionState => (revalidatePath("/admin/discovery"), { ok: true, message });
const fail = (e: unknown): ActionState => ({ error: e instanceof Error ? e.message : "Something went wrong." });

export async function createProspect(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const parsed = prospectInputSchema.safeParse({ ...Object.fromEntries(form), intent_signals: splitList(String(form.get("intent_signals") ?? "")) });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  try {
    const ws = await workspaceId(supabase);
    const row: NewProspect = { ...toProspectFields(parsed.data), source: "manual", provider: "manual" };
    const { imported } = await insertProspects(supabase, ws, user.id, [row], SOURCE_POLICIES.manual, null, await scoringConfig(supabase, ws));
    if (!imported) return { error: "A prospect or CRM company with this domain already exists." };
    await audit(supabase, user, "create", "prospects", null, { name: row.name, domain: row.domain });
    return done(`${row.name} added.`);
  } catch (e) {
    return fail(e);
  }
}

export async function importCsv(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file." };
  if (file.size > CSV_MAX_BYTES) return { error: "The file is larger than 1 MB." };
  const basis = legalBasis.safeParse(form.get("legal_basis"));
  if (!basis.success) return { error: basis.error.issues[0]?.message };
  try {
    const parsed = readProspectsCsv(await file.text());
    const ws = await workspaceId(supabase);
    const rows: NewProspect[] = parsed.rows.map((r) => ({ ...r, source: "csv_upload", provider: "csv" }));
    const r = await runImport(supabase, ws, user.id, {
      source: "csv_upload", provider: "csv", sourceName: file.name.slice(0, 120), legalBasis: basis.data,
      query: { file: file.name.slice(0, 120), ignored_columns: parsed.ignoredColumns } as Json, rows, rejected: parsed.errors.length,
    });
    await audit(supabase, user, "import", "discovery_jobs", r.jobId, { imported: r.imported, duplicates: r.duplicates + parsed.duplicatesInFile, rejected: parsed.errors.length });
    const problems = parsed.errors.slice(0, 3).map((x) => `row ${x.row}: ${x.message}`).join("; ");
    return done(
      `Imported ${r.imported}. Skipped ${r.duplicates + parsed.duplicatesInFile} duplicates and ${parsed.errors.length} invalid rows.` +
        (problems ? ` First problems: ${problems}.` : "") + (parsed.ignoredColumns.length ? ` Ignored columns: ${parsed.ignoredColumns.join(", ")}.` : ""),
    );
  } catch (e) {
    return fail(e);
  }
}

const discoverySchema = z.object({
  provider: z.string(),
  category: z.string().trim().min(2, "Enter a business category.").max(80),
  location: z.string().trim().min(2, "Enter a location.").max(80),
  max: z.coerce.number().int().min(1).max(60),
  legal_basis: legalBasis,
});

export async function runDiscovery(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const parsed = discoverySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const provider = providerById(parsed.data.provider);
  if (!provider?.enabled()) return { error: "That provider is not enabled. It needs an API key and the owner's approval (paid service)." };
  try {
    const { category, location, max } = parsed.data;
    const found = await provider.search({ category, location, max });
    const rows: NewProspect[] = found.map((f) => ({
      name: f.name, website: f.website, domain: f.domain, category: f.category, industry: f.category, city: f.city, region: f.region,
      country: f.country && /^[A-Z]{2}$/.test(f.country) ? f.country : null, size_band: null, intent_signals: [], notes: null,
      source: "api", provider: provider.id, provider_ref: f.provider_ref,
    }));
    const ws = await workspaceId(supabase);
    const r = await runImport(supabase, ws, user.id, { source: "api", provider: provider.id, sourceName: provider.label, legalBasis: parsed.data.legal_basis, query: { category, location, max }, rows, rejected: 0 });
    await audit(supabase, user, "discover", "discovery_jobs", r.jobId, { provider: provider.id, imported: r.imported });
    return done(`${provider.label}: found ${found.length}, imported ${r.imported}, skipped ${r.duplicates} duplicates.`);
  } catch (e) {
    return fail(e);
  }
}

export async function analyze(prospectId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!ID.safeParse(prospectId).success) return { error: "Invalid prospect." };
  try {
    const a = await analyzeProspect(supabase, await workspaceId(supabase), prospectId);
    const c = a.findings.filter((f) => f.certainty === "confirmed").length;
    return a.status === "ok" ? done(`Analysed: ${c} confirmed and ${a.findings.length - c} inferred findings.`) : done(`Not analysed: ${a.error}`);
  } catch (e) {
    return fail(e);
  }
}

export async function approveToCrm(prospectId: string): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  if (!ID.safeParse(prospectId).success) return { error: "Invalid prospect." };
  try {
    const r = await addToCrm(supabase, prospectId); // audited inside the database function
    revalidatePath("/admin/leads");
    return done(r.already_added ? "Already in the CRM." : "Approved and added to the CRM as a new lead.");
  } catch (e) {
    return fail(e);
  }
}

export async function review(prospectId: string, status: "rejected" | "pending"): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  if (!ID.safeParse(prospectId).success || !["rejected", "pending"].includes(status)) return { error: "Invalid request." };
  const { error } = await supabase.from("prospects").update({ review_status: status }).eq("id", prospectId);
  if (error) return { error: error.message };
  await audit(supabase, user, status === "rejected" ? "reject" : "reopen", "prospects", prospectId);
  return done(status === "rejected" ? "Prospect rejected." : "Prospect reopened for review.");
}

export async function removeProspect(prospectId: string): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  if (!ID.safeParse(prospectId).success) return { error: "Invalid prospect." };
  const { error } = await supabase.from("prospects").delete().eq("id", prospectId);
  if (error) return { error: error.message };
  await audit(supabase, user, "delete", "prospects", prospectId);
  return done("Prospect deleted.");
}

const list = (v: FormDataEntryValue | null) => String(v ?? "").split(/[\n,]/).map((s) => s.trim().toLowerCase()).filter(Boolean);

export async function saveScoring(_: ActionState, form: FormData): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  try {
    const ws = await workspaceId(supabase);
    const current = await scoringConfig(supabase, ws);
    const parsed = scoringConfigSchema.safeParse({
      ...current,
      weights: {
        industryFit: Number(form.get("industryFit")), websiteNeeds: Number(form.get("websiteNeeds")),
        projectBudget: Number(form.get("projectBudget")), purchaseIntent: Number(form.get("purchaseIntent")),
      },
      targetIndustries: list(form.get("targetIndustries")),
      adjacentIndustries: list(form.get("adjacentIndustries")),
      qualifyThreshold: Number(form.get("qualifyThreshold")),
    });
    if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the settings." };
    const { error } = await supabase.from("discovery_settings").upsert({ workspace_id: ws, scoring: parsed.data as unknown as Json, updated_by: user.id, updated_at: new Date().toISOString() });
    if (error) return { error: error.message };
    await audit(supabase, user, "update", "discovery_settings", ws, { weights: parsed.data.weights, threshold: parsed.data.qualifyThreshold });
    return done("Scoring settings saved. Use “Rescore all” to apply them to existing prospects.");
  } catch (e) {
    return fail(e);
  }
}

export async function resetScoring(): Promise<ActionState> {
  const { supabase, user } = await requireAdmin();
  const ws = await workspaceId(supabase);
  const { error } = await supabase.from("discovery_settings").upsert({ workspace_id: ws, scoring: DEFAULT_SCORING as unknown as Json, updated_by: user.id, updated_at: new Date().toISOString() });
  return error ? { error: error.message } : done("Scoring reset to the defaults.");
}

export async function rescoreAll(): Promise<ActionState> {
  const { supabase } = await requireAdmin();
  try {
    const ws = await workspaceId(supabase);
    const config = await scoringConfig(supabase, ws);
    const { data: prospects } = await supabase.from("prospects").select("*").eq("workspace_id", ws).limit(500);
    const { data: analyses } = await supabase.from("website_analyses").select("prospect_id, status, findings, signals, created_at").eq("workspace_id", ws).order("created_at", { ascending: false });
    const latest = new Map<string, { status: string; findings: Finding[]; signals: Signals | null }>();
    for (const a of analyses ?? []) if (!latest.has(a.prospect_id)) latest.set(a.prospect_id, { status: a.status, findings: a.findings as unknown as Finding[], signals: a.signals as unknown as Signals });
    for (const p of prospects ?? []) await rescore(supabase, ws, p, latest.get(p.id) ?? null, config);
    return done(`Rescored ${prospects?.length ?? 0} prospects.`);
  } catch (e) {
    return fail(e);
  }
}
