// Google PageSpeed Insights v5 (Lighthouse run by Google, so nothing executes on our servers). Free; with
// PAGESPEED_API_KEY set the quota is 25,000 runs a day, without it Google allows only a handful. We keep a compact
// summary, not the multi-megabyte Lighthouse report.

export type Strategy = "mobile" | "desktop";
export type PsiSummary = {
  scores: { performance: number | null; accessibility: number | null; bestPractices: number | null; seo: number | null };
  vitals: { lcp: string | null; cls: string | null; tbt: string | null; fcp: string | null; speedIndex: string | null };
  opportunities: { title: string; savings: string }[];
};

const API = "https://www.googleapis.com/pagespeedonline/v5/runPagespeed";
const score = (v: unknown) => (typeof v === "number" ? Math.round(v * 100) : null);

/** Lighthouse JSON → the few numbers a client can act on (pure, so it can be checked offline). */
export function summarize(lhr: {
  categories?: Record<string, { score?: number | null }>;
  audits?: Record<
    string,
    { title?: string; displayValue?: string; score?: number | null; metricSavings?: Record<string, number>; details?: { type?: string; overallSavingsMs?: number } }
  >;
}): PsiSummary {
  const c = lhr.categories ?? {};
  const a = lhr.audits ?? {};
  const dv = (id: string) => a[id]?.displayValue ?? null;
  // Lighthouse ≤12 marks fixes as `details.type: "opportunity"` with overallSavingsMs; Lighthouse 13 (current PSI) uses
  // "insights" that report `metricSavings` (ms saved on LCP / FCP) instead. Read both; failing ones only.
  const saving = (x: (typeof a)[string]) =>
    x.details?.type === "opportunity" ? (x.details.overallSavingsMs ?? 0) : Math.max(x.metricSavings?.LCP ?? 0, x.metricSavings?.FCP ?? 0);
  const opportunities = Object.values(a)
    .filter((x) => saving(x) > 0 && (x.details?.type === "opportunity" || (x.score ?? 0) < 0.9))
    .sort((x, y) => saving(y) - saving(x))
    .slice(0, 5)
    .map((x) => ({ title: x.title ?? "", savings: x.displayValue ?? `${Math.round(saving(x) / 100) / 10} s` }));
  return {
    scores: {
      performance: score(c.performance?.score),
      accessibility: score(c.accessibility?.score),
      bestPractices: score(c["best-practices"]?.score),
      seo: score(c.seo?.score),
    },
    vitals: { lcp: dv("largest-contentful-paint"), cls: dv("cumulative-layout-shift"), tbt: dv("total-blocking-time"), fcp: dv("first-contentful-paint"), speedIndex: dv("speed-index") },
    opportunities,
  };
}

/** One PageSpeed run. Throws on API errors (quota, unreachable site) with Google's message. */
export async function runPagespeed(url: string, strategy: Strategy, timeoutMs = 50_000): Promise<PsiSummary> {
  const q = new URLSearchParams({ url, strategy });
  for (const cat of ["performance", "accessibility", "best-practices", "seo"]) q.append("category", cat);
  if (process.env.PAGESPEED_API_KEY) q.set("key", process.env.PAGESPEED_API_KEY);
  const res = await fetch(`${API}?${q}`, { signal: AbortSignal.timeout(timeoutMs), cache: "no-store" });
  const body = (await res.json().catch(() => ({}))) as { lighthouseResult?: Parameters<typeof summarize>[0]; error?: { message?: string } };
  if (!res.ok || !body.lighthouseResult) throw new Error(body.error?.message ?? `PageSpeed returned ${res.status}`);
  return summarize(body.lighthouseResult);
}
