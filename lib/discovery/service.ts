import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";
import { createSupabaseService } from "@/lib/supabase/service";
import { emitEvent } from "@/lib/events/contracts";
import { analyzeWebsite, type Analysis, type Finding, type Signals } from "./analyze";
import { crmFieldsFor, expiresAt, policyFor, type ProviderPolicy } from "./providers";
import { resolveConfig, scoreProspect, type ScoreResult, type ScoringConfig } from "./scoring";
import type { ProspectFields } from "./prospect";

// Server-side discovery operations. Reads and writes go through the caller's session (RLS + guard triggers
// apply); only analysis rows and outbox events, which users may not write, use the service role.

type Db = SupabaseClient<Database>;
export type Prospect = Database["public"]["Tables"]["prospects"]["Row"];
export type NewProspect = ProspectFields & { source: "manual" | "csv_upload" | "api"; provider: string; provider_ref?: string | null };

export async function workspaceId(db: Db): Promise<string> {
  const { data, error } = await db.from("workspaces").select("id").eq("slug", "gravityy-studio").single();
  if (error || !data) throw new Error("Workspace not found or not accessible.");
  return data.id;
}

export async function scoringConfig(db: Db, ws: string): Promise<ScoringConfig> {
  const { data } = await db.from("discovery_settings").select("scoring").eq("workspace_id", ws).maybeSingle();
  return resolveConfig(data?.scoring);
}

const chunks = <T>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size));

const facts = (p: Pick<Prospect, "industry" | "category" | "size_band" | "intent_signals" | "website">) => ({
  industry: p.industry, category: p.category, size_band: p.size_band, intent_signals: p.intent_signals ?? [], website: p.website,
});
const scoreColumns = (s: ScoreResult) => ({ score: s.total, score_breakdown: s as unknown as Json, scored_at: new Date().toISOString() });

/**
 * Inserts prospects, skipping duplicates by normalised domain (against existing prospects and CRM companies)
 * and by provider identifier. Each row is scored from what is known so far (analysis comes later).
 */
export async function insertProspects(db: Db, ws: string, userId: string, rows: NewProspect[], policy: ProviderPolicy, jobId: string | null, config: ScoringConfig) {
  const domains = [...new Set(rows.map((r) => r.domain).filter((d): d is string => Boolean(d)))];
  const refs = [...new Set(rows.map((r) => r.provider_ref).filter((r): r is string => Boolean(r)))];
  // Lookups in chunks: 1,000 values in one PostgREST filter would exceed URL length limits.
  const takenDomains = new Set<string | null>();
  const takenRefs = new Set<string>();
  for (const part of chunks(domains, 100)) {
    const [a, b] = await Promise.all([
      db.from("prospects").select("domain").eq("workspace_id", ws).in("domain", part),
      db.from("companies").select("domain").eq("workspace_id", ws).in("domain", part),
    ]);
    for (const r of [...(a.data ?? []), ...(b.data ?? [])]) takenDomains.add(r.domain);
  }
  for (const part of chunks(refs, 100)) {
    const { data } = await db.from("prospects").select("provider, provider_ref").eq("workspace_id", ws).in("provider_ref", part);
    for (const r of data ?? []) takenRefs.add(`${r.provider}:${r.provider_ref}`);
  }
  const fresh = rows.filter((r) => !(r.domain && takenDomains.has(r.domain)) && !(r.provider_ref && takenRefs.has(`${r.provider}:${r.provider_ref}`)));
  let duplicates = rows.length - fresh.length;

  const expires = expiresAt(policy);
  const toRow = (r: NewProspect) => ({
    ...r, workspace_id: ws, created_by: userId, discovery_job_id: jobId, expires_at: expires, provider_ref: r.provider_ref ?? null,
    ...scoreColumns(scoreProspect(facts(r), null, config)),
  });
  let imported = 0;
  if (fresh.length) {
    const { error, count } = await db.from("prospects").insert(fresh.map(toRow), { count: "exact" });
    if (!error) imported = count ?? fresh.length;
    else if (error.code === "23505") {
      // A concurrent import took some of these: fall back to row-by-row so the rest still land.
      for (const r of fresh) {
        const one = await db.from("prospects").insert(toRow(r));
        if (!one.error) imported++;
        else if (one.error.code === "23505") duplicates++;
        else throw new Error(one.error.message);
      }
    } else throw new Error(error.message);
  }
  return { imported, duplicates };
}

/** Creates the discovery job record, inserts, completes the job and emits discovery.completed. */
export async function runImport(db: Db, ws: string, userId: string, input: {
  source: "csv_upload" | "api"; provider: string; sourceName: string; legalBasis: string; query: Json; rows: NewProspect[]; rejected: number;
}) {
  const config = await scoringConfig(db, ws);
  const { data: job, error } = await db.from("discovery_jobs").insert({
    workspace_id: ws, source: input.source, source_name: input.sourceName, legal_basis: input.legalBasis, query: input.query,
    max_results: Math.max(1, Math.min(1000, input.rows.length || 1)), status: "running", created_by: userId, started_at: new Date().toISOString(),
  }).select("id").single();
  if (error || !job) throw new Error(error?.message ?? "Could not start the discovery job.");
  let result = { imported: 0, duplicates: 0 };
  let status: "completed" | "failed" = "completed";
  let failure: string | null = null;
  try {
    result = await insertProspects(db, ws, userId, input.rows, policyFor(input.source, input.provider), job.id, config);
  } catch (e) {
    status = "failed";
    failure = e instanceof Error ? e.message : "Import failed";
  }
  await db.from("discovery_jobs").update({
    status, error: failure, found_count: input.rows.length + input.rejected, imported_count: result.imported,
    duplicate_count: result.duplicates, rejected_count: input.rejected, finished_at: new Date().toISOString(),
  }).eq("id", job.id);
  await emitEvent(createSupabaseService(), "discovery.completed", ws, {
    job_id: job.id, source: input.source, provider: input.provider, status,
    found: input.rows.length + input.rejected, imported: result.imported, duplicates: result.duplicates, rejected: input.rejected,
  }, job.id);
  if (failure) throw new Error(failure);
  return { jobId: job.id, ...result };
}

/** Rescores one prospect from its latest analysis and stores the breakdown; emits lead.scored. */
export async function rescore(db: Db, ws: string, p: Prospect, analysis: { status: string; findings: Finding[]; signals: Signals | null } | null, config?: ScoringConfig) {
  const score = scoreProspect(facts(p), analysis, config ?? (await scoringConfig(db, ws)));
  const { error } = await db.from("prospects").update(scoreColumns(score)).eq("id", p.id);
  if (error) throw new Error(error.message);
  await emitEvent(createSupabaseService(), "lead.scored", ws, {
    prospect_id: p.id, score: score.total, qualified: score.qualified, confidence: score.confidence, model: score.model,
    components: score.components.map(({ key, points, max, known }) => ({ key, points, max, known })),
  }, p.id);
  return score;
}

/** Fetches + analyses the prospect's public website, stores the analysis, updates status and score. */
export async function analyzeProspect(db: Db, ws: string, prospectId: string): Promise<Analysis> {
  const { data: p, error } = await db.from("prospects").select("*").eq("id", prospectId).single();
  if (error || !p) throw new Error("Prospect not found.");
  if (!p.website) throw new Error("This prospect has no website to analyse.");
  await db.from("prospects").update({ research_status: "analyzing" }).eq("id", p.id);
  const analysis = await analyzeWebsite(p.website);
  const svc = createSupabaseService();
  const { data: row, error: insertError } = await svc.from("website_analyses").insert({
    workspace_id: ws, prospect_id: p.id, url: analysis.url.slice(0, 300), final_url: analysis.finalUrl?.slice(0, 300) ?? null,
    status: analysis.status, http_status: analysis.httpStatus, duration_ms: analysis.durationMs, bytes: analysis.bytes,
    findings: analysis.findings as unknown as Json, signals: (analysis.signals ?? {}) as unknown as Json,
    confirmed_count: analysis.findings.filter((f) => f.certainty === "confirmed").length,
    inferred_count: analysis.findings.filter((f) => f.certainty === "inferred").length,
    error: analysis.error?.slice(0, 1000) ?? null,
  }).select("id").single();
  const research = analysis.status === "ok" ? "analyzed" : analysis.status === "error" ? "failed" : "blocked";
  await db.from("prospects").update({ research_status: research }).eq("id", p.id);
  if (insertError || !row) throw new Error(insertError?.message ?? "Could not save the analysis.");
  await emitEvent(svc, "website.analyzed", ws, {
    prospect_id: p.id, analysis_id: row.id, status: analysis.status,
    confirmed_count: analysis.findings.filter((f) => f.certainty === "confirmed").length,
    inferred_count: analysis.findings.filter((f) => f.certainty === "inferred").length,
    high_severity_count: analysis.findings.filter((f) => f.severity === "high").length,
  }, p.id);
  await rescore(db, ws, { ...p, research_status: research }, analysis);
  return analysis;
}

/** Admin approval: copies only provider-permitted fields into the CRM, atomically (prospect_add_to_crm). */
export async function addToCrm(db: Db, prospectId: string) {
  const { data: p, error } = await db.from("prospects").select("*").eq("id", prospectId).single();
  if (error || !p) throw new Error("Prospect not found.");
  const qualified = ((p.score_breakdown as { qualified?: boolean } | null)?.qualified) ?? false;
  const { company, qualification } = crmFieldsFor(p, qualified);
  const { data, error: rpcError } = await db.rpc("prospect_add_to_crm", { p_prospect: p.id, p_company: company as unknown as Json, p_qualification: qualification });
  if (rpcError) throw new Error(rpcError.message);
  return data as { company_id: string; lead_id: string | null; already_added: boolean };
}
