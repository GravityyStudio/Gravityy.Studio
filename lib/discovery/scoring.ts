import { z } from "zod";
import type { Finding, Signals } from "./analyze";

// Discovery lead score: transparent, configurable, deterministic. 100 points split across four components.
// Every point carries a reason; a component with no data scores 0 and is marked "unknown" (never guessed),
// which lowers the confidence instead of the score being made up. AI analysis is optional and never scores.

export const SIZE_BANDS = ["1-10", "11-50", "51-200", "201-1000", "1000+"] as const;
const fraction = z.number().min(0).max(1);

export const scoringConfigSchema = z.object({
  version: z.literal(1),
  weights: z
    .object({ industryFit: z.number().int().min(0).max(100), websiteNeeds: z.number().int().min(0).max(100), projectBudget: z.number().int().min(0).max(100), purchaseIntent: z.number().int().min(0).max(100) })
    .refine((w) => w.industryFit + w.websiteNeeds + w.projectBudget + w.purchaseIntent === 100, "Weights must add up to 100."),
  targetIndustries: z.array(z.string().trim().toLowerCase().min(2).max(60)).max(50),
  adjacentIndustries: z.array(z.string().trim().toLowerCase().min(2).max(60)).max(50),
  issuePoints: z.object({ high: z.number().min(0).max(50), medium: z.number().min(0).max(50), low: z.number().min(0).max(50) }),
  inferredFactor: fraction,      // inferred findings count for this share of a confirmed one
  noWebsiteNeed: fraction,       // share of the website-needs weight when a business has no website at all
  sizeBudget: z.record(z.enum(SIZE_BANDS), fraction),
  ecommerceBudget: fraction,     // extra share of the budget weight when the site sells online (inferred)
  intentSignals: z.record(z.string().regex(/^[a-z_]{2,40}$/), fraction),
  qualifyThreshold: z.number().int().min(0).max(100),
});
export type ScoringConfig = z.infer<typeof scoringConfigSchema>;

export const DEFAULT_SCORING: ScoringConfig = {
  version: 1,
  weights: { industryFit: 25, websiteNeeds: 35, projectBudget: 20, purchaseIntent: 20 },
  targetIndustries: ["dental", "clinic", "healthcare", "real estate", "fitness", "gym", "restaurant", "hospitality", "education", "coaching", "salon", "spa", "interior design", "architecture", "d2c", "ecommerce", "retail"],
  adjacentIndustries: ["legal", "accounting", "consulting", "logistics", "manufacturing", "travel", "events"],
  issuePoints: { high: 10, medium: 6, low: 3 },
  inferredFactor: 0.5,
  noWebsiteNeed: 1,
  sizeBudget: { "1-10": 0.35, "11-50": 0.65, "51-200": 0.9, "201-1000": 1, "1000+": 1 },
  ecommerceBudget: 0.25,
  intentSignals: { requested_quote: 1, referral: 0.6, engaged_content: 0.4, recently_funded: 0.5, hiring: 0.3, expanding: 0.4 },
  qualifyThreshold: 60,
};

export type ProspectFacts = {
  industry: string | null;
  category: string | null;
  size_band: string | null;
  intent_signals: string[];
  website: string | null;
};
export type AnalysisFacts = { status: string; findings: Finding[]; signals: Signals | null } | null;

export type Component = { key: keyof ScoringConfig["weights"]; label: string; points: number; max: number; known: boolean; reasons: string[] };
export type ScoreResult = { total: number; qualified: boolean; confidence: "high" | "medium" | "low"; components: Component[]; model: "discovery-rules-v1" };

const round1 = (n: number) => Math.round(n * 10) / 10;
const cap = (n: number, max: number) => Math.max(0, Math.min(max, n));

function industryFit(p: ProspectFacts, c: ScoringConfig): Omit<Component, "key" | "label"> {
  const max = c.weights.industryFit;
  const text = `${p.industry ?? ""} ${p.category ?? ""}`.toLowerCase().trim();
  if (!text) return { points: 0, max, known: false, reasons: ["Industry not known yet."] };
  const target = c.targetIndustries.find((t) => text.includes(t));
  if (target) return { points: max, max, known: true, reasons: [`Target industry: “${target}”.`] };
  const adjacent = c.adjacentIndustries.find((t) => text.includes(t));
  if (adjacent) return { points: round1(max / 2), max, known: true, reasons: [`Adjacent industry: “${adjacent}” (half points).`] };
  return { points: 0, max, known: true, reasons: [`“${text}” is not a target industry.`] };
}

function websiteNeeds(p: ProspectFacts, a: AnalysisFacts, c: ScoringConfig): Omit<Component, "key" | "label"> {
  const max = c.weights.websiteNeeds;
  if (!p.website) return { points: round1(max * c.noWebsiteNeed), max, known: true, reasons: ["No website listed (confirmed need)."] };
  if (!a) return { points: 0, max, known: false, reasons: ["Website not analysed yet."] };
  if (a.status !== "ok") return { points: 0, max, known: false, reasons: [`Website could not be analysed (${a.status.replace(/_/g, " ")}).`] };
  let raw = 0;
  const reasons: string[] = [];
  for (const f of a.findings) {
    const pts = c.issuePoints[f.severity] * (f.certainty === "confirmed" ? 1 : c.inferredFactor);
    if (pts <= 0) continue;
    raw += pts;
    reasons.push(`${f.title} (${f.severity}, ${f.certainty}) +${round1(pts)}`);
  }
  if (!reasons.length) reasons.push("No visible issues found.");
  return { points: round1(cap(raw, max)), max, known: true, reasons };
}

function projectBudget(p: ProspectFacts, a: AnalysisFacts, c: ScoringConfig): Omit<Component, "key" | "label"> {
  const max = c.weights.projectBudget;
  const reasons: string[] = [];
  let share = 0;
  let known = false;
  const band = SIZE_BANDS.find((b) => b === p.size_band);
  if (band) {
    share += c.sizeBudget[band] ?? 0;
    known = true;
    reasons.push(`Company size ${band} employees: ${Math.round((c.sizeBudget[band] ?? 0) * 100)}% of budget points.`);
  }
  if (a?.signals?.ecommerce) {
    share += c.ecommerceBudget;
    known = true;
    reasons.push(`Sells online (inferred from the site): +${Math.round(c.ecommerceBudget * 100)}%.`);
  }
  if (!known) reasons.push("No size or revenue signal yet.");
  return { points: round1(cap(max * share, max)), max, known, reasons };
}

function purchaseIntent(p: ProspectFacts, c: ScoringConfig): Omit<Component, "key" | "label"> {
  const max = c.weights.purchaseIntent;
  const counted = p.intent_signals.filter((s) => s in c.intentSignals);
  if (!counted.length) return { points: 0, max, known: false, reasons: ["No purchase-intent signals recorded."] };
  const share = counted.reduce((sum, s) => sum + (c.intentSignals[s] ?? 0), 0);
  return { points: round1(cap(max * share, max)), max, known: true, reasons: counted.map((s) => `${s.replace(/_/g, " ")}: +${Math.round((c.intentSignals[s] ?? 0) * 100)}%`) };
}

export function scoreProspect(p: ProspectFacts, a: AnalysisFacts, config: ScoringConfig = DEFAULT_SCORING): ScoreResult {
  const components: Component[] = [
    { key: "industryFit", label: "Industry fit", ...industryFit(p, config) },
    { key: "websiteNeeds", label: "Website needs", ...websiteNeeds(p, a, config) },
    { key: "projectBudget", label: "Project budget", ...projectBudget(p, a, config) },
    { key: "purchaseIntent", label: "Purchase intent", ...purchaseIntent(p, config) },
  ];
  const total = Math.round(cap(components.reduce((s, x) => s + x.points, 0), 100));
  const known = components.filter((x) => x.known).length;
  return { total, qualified: total >= config.qualifyThreshold, confidence: known === 4 ? "high" : known >= 2 ? "medium" : "low", components, model: "discovery-rules-v1" };
}

/** Stored settings merged over the defaults, validated. Bad stored JSON falls back to defaults (and is logged). */
export function resolveConfig(stored: unknown): ScoringConfig {
  if (!stored) return DEFAULT_SCORING;
  const parsed = scoringConfigSchema.safeParse({ ...DEFAULT_SCORING, ...(stored as object) });
  if (!parsed.success) console.error("[discovery] invalid scoring settings, using defaults:", parsed.error.issues[0]?.message);
  return parsed.success ? parsed.data : DEFAULT_SCORING;
}
