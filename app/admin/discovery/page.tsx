import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { PROVIDERS, policyFor } from "@/lib/discovery/providers";
import { scoringConfig, workspaceId } from "@/lib/discovery/service";
import type { Finding } from "@/lib/discovery/analyze";
import type { ScoreResult } from "@/lib/discovery/scoring";
import DiscoveryDashboard from "@/components/discovery/DiscoveryDashboard";
import type { AnalysisView, ProspectView } from "@/components/discovery/types";

export const metadata = { title: "Discovery" };

const opt = z.preprocess((v) => (v === "" ? undefined : v), z.string().trim().max(100).optional());
const filtersSchema = z.object({
  q: opt, industry: opt, category: opt, location: opt,
  review: z.enum(["all", "pending", "approved", "rejected"]).catch("all"),
  research: z.enum(["any", "new", "analyzing", "analyzed", "failed", "blocked"]).catch("any"),
  source: z.enum(["any", "manual", "csv_upload", "api"]).catch("any"),
  min: z.coerce.number().int().min(0).max(100).catch(0),
});

// PostgREST filter strings: strip characters that would break or extend an or()/ilike expression.
const safe = (v: string) => v.replace(/[,()%*\\:]/g, " ").trim();
const COLUMNS = "id, name, domain, website, industry, category, city, region, country, size_band, source, provider, intent_signals, research_status, review_status, score, score_breakdown, company_id, notes, expires_at, created_at";

export default async function DiscoveryPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { supabase } = await requireAdmin();
  const raw = Object.fromEntries(Object.entries(await searchParams).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]));
  const f = filtersSchema.parse(raw);
  const ws = await workspaceId(supabase);

  let query = supabase.from("prospects").select(COLUMNS).eq("workspace_id", ws);
  if (f.q && safe(f.q)) query = query.or(`name.ilike.%${safe(f.q)}%,domain.ilike.%${safe(f.q)}%`);
  if (f.industry && safe(f.industry)) query = query.ilike("industry", `%${safe(f.industry)}%`);
  if (f.category && safe(f.category)) query = query.ilike("category", `%${safe(f.category)}%`);
  if (f.location && safe(f.location)) {
    const l = safe(f.location);
    query = query.or(`city.ilike.%${l}%,region.ilike.%${l}%,country.eq.${l.toUpperCase().slice(0, 2)}`);
  }
  if (f.review !== "all") query = query.eq("review_status", f.review);
  if (f.research !== "any") query = query.eq("research_status", f.research);
  if (f.source !== "any") query = query.eq("source", f.source);
  if (f.min > 0) query = query.gte("score", f.min);

  const [{ data: rows, error }, { data: facets }, config] = await Promise.all([
    query.order("score", { ascending: false, nullsFirst: false }).order("created_at", { ascending: false }).limit(300),
    supabase.from("prospects").select("industry, category, review_status, score").eq("workspace_id", ws).limit(5000),
    scoringConfig(supabase, ws),
  ]);

  const ids = (rows ?? []).map((r) => r.id);
  const latest = new Map<string, AnalysisView>();
  for (let i = 0; i < ids.length; i += 100) {
    const { data } = await supabase.from("website_analyses").select("prospect_id, status, http_status, final_url, created_at, findings, error").in("prospect_id", ids.slice(i, i + 100)).order("created_at", { ascending: false });
    for (const a of data ?? []) if (!latest.has(a.prospect_id)) latest.set(a.prospect_id, { status: a.status, http_status: a.http_status, final_url: a.final_url, created_at: a.created_at, findings: a.findings as unknown as Finding[], error: a.error });
  }

  const prospects: ProspectView[] = (rows ?? []).map(({ score_breakdown, ...r }) => {
    const policy = policyFor(r.source, r.provider);
    return { ...r, intent_signals: r.intent_signals ?? [], breakdown: score_breakdown as unknown as ScoreResult | null, policy: { note: policy.note, persistable: policy.persistable, attribution: policy.attribution ?? null, retentionDays: policy.retentionDays } };
  });
  const all = facets ?? [];
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter((x): x is string => Boolean(x)))].sort().slice(0, 100);
  const scored = all.filter((x) => x.score !== null);

  return (
    <DiscoveryDashboard
      prospects={prospects}
      analyses={Object.fromEntries(latest)}
      filters={f}
      error={error?.message ?? null}
      stats={{
        total: all.length,
        pending: all.filter((x) => x.review_status === "pending").length,
        approved: all.filter((x) => x.review_status === "approved").length,
        qualified: scored.filter((x) => (x.score ?? 0) >= config.qualifyThreshold).length,
        average: scored.length ? Math.round(scored.reduce((s, x) => s + (x.score ?? 0), 0) / scored.length) : null,
      }}
      industries={uniq(all.map((x) => x.industry))}
      categories={uniq(all.map((x) => x.category))}
      providers={PROVIDERS.map((p) => ({ id: p.id, label: p.label, enabled: p.enabled(), note: p.policy.note }))}
      scoring={{ weights: config.weights, targetIndustries: config.targetIndustries, adjacentIndustries: config.adjacentIndustries, qualifyThreshold: config.qualifyThreshold }}
    />
  );
}
