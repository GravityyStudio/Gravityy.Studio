import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageHero from "@/components/PageHero";
import Button from "@/components/ui/Button";
import type { PsiSummary } from "@/lib/audit/pagespeed";
import type { Finding } from "@/lib/discovery/analyze";
import { createSupabaseService } from "@/lib/supabase/service";

// Private report, opened only through the emailed link: always fresh, never indexed or cached.
export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Your website audit", robots: { index: false, follow: false } };

type Params = Promise<{ token: string }>;
const SCORE_LABELS = [
  ["performance", "Performance"],
  ["accessibility", "Accessibility"],
  ["bestPractices", "Best practices"],
  ["seo", "SEO"],
] as const;
const VITALS = [
  ["lcp", "Largest Contentful Paint"],
  ["fcp", "First Contentful Paint"],
  ["tbt", "Total Blocking Time"],
  ["cls", "Cumulative Layout Shift"],
  ["speedIndex", "Speed Index"],
] as const;
// Lighthouse's own bands: 90+ good, 50–89 needs work, below 50 poor.
const band = (s: number | null) => (s === null ? "text-muted" : s >= 90 ? "text-accent" : s >= 50 ? "text-[#ffb547]" : "text-danger");
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

export default async function AuditReport({ params }: { params: Params }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{32,64}$/.test(token)) notFound();
  const { data: audit } = await createSupabaseService().from("site_audits").select("url, status, psi, findings, created_at").eq("token", token).maybeSingle();
  if (!audit) notFound();

  const site = audit.url.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const psi = (audit.psi ?? {}) as { mobile?: PsiSummary | null; desktop?: PsiSummary | null };
  const findings = ((audit.findings ?? []) as Finding[]).toSorted((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  const date = new Date(audit.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

  if (audit.status === "queued" || audit.status === "running")
    return (
      <main id="main">
        {/* Re-check every 10 s until the audit has finished */}
        <meta httpEquiv="refresh" content="10" />
        <PageHero title="Your audit is running" lede={`We're testing ${site} on mobile and desktop. This page refreshes on its own; it usually takes under a minute.`} />
      </main>
    );
  if (audit.status === "failed")
    return (
      <main id="main">
        <PageHero title="We couldn't test this site automatically" lede={`We couldn't complete the automated tests for ${site}. We've been notified and will review it by hand and email you.`} />
      </main>
    );

  return (
    <main id="main">
      <PageHero title="Your website audit" lede={`${site}, tested on ${date}: speed, Core Web Vitals, accessibility, SEO and on-page checks.`} />

      {(["mobile", "desktop"] as const).map((strategy) => {
        const r = psi[strategy];
        return (
          <section key={strategy} aria-labelledby={`${strategy}-h`} className="container-x pb-[clamp(48px,7vw,96px)]">
            <h2 id={`${strategy}-h`} className="display !text-[clamp(28px,3vw,40px)] capitalize">
              {strategy}
            </h2>
            {!r ? (
              <p className="mt-4 text-muted">Google&apos;s speed test couldn&apos;t complete for {strategy} this time. The on-page checks below still apply.</p>
            ) : (
              <>
                <dl className="mt-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
                  {SCORE_LABELS.map(([k, label]) => (
                    <div key={k} className="rounded-xl bg-surface p-6 shadow-hairline">
                      <dt className="font-mono text-[13px] text-muted">{label}</dt>
                      <dd className={`mt-2 text-[clamp(36px,4vw,52px)] font-semibold leading-none ${band(r.scores[k])}`}>{r.scores[k] ?? "–"}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-8 grid gap-8 lg:grid-cols-2">
                  <div>
                    <h3 className="font-semibold">Core Web Vitals (lab)</h3>
                    <dl className="mt-3 divide-y divide-fg/10">
                      {VITALS.map(([k, label]) => (
                        <div key={k} className="flex justify-between gap-4 py-2.5 text-[15px]">
                          <dt className="text-muted">{label}</dt>
                          <dd className="font-mono">{r.vitals[k] ?? "–"}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <div>
                    <h3 className="font-semibold">Biggest speed wins</h3>
                    {r.opportunities.length ? (
                      <ul className="mt-3 flex flex-col gap-2.5 text-[15px]">
                        {r.opportunities.map((o) => (
                          <li key={o.title} className="flex justify-between gap-4">
                            <span>{o.title}</span>
                            <span className="shrink-0 font-mono text-muted">{o.savings}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="mt-3 text-[15px] text-muted">No major speed opportunities found.</p>
                    )}
                  </div>
                </div>
              </>
            )}
          </section>
        );
      })}

      <section aria-labelledby="onpage-h" className="container-x pb-[clamp(48px,7vw,96px)]">
        <h2 id="onpage-h" className="display !text-[clamp(28px,3vw,40px)]">
          On-page checks
        </h2>
        {findings.length ? (
          <ul className="mt-8 flex flex-col gap-3">
            {findings.map((f) => (
              <li key={f.id} className="rounded-xl bg-surface p-5 shadow-hairline">
                <div className="flex flex-wrap items-center gap-2 font-mono text-[12px]">
                  <span className={`rounded-pill px-2.5 py-0.5 shadow-hairline ${f.severity === "high" ? "text-danger" : f.severity === "medium" ? "text-[#ffb547]" : "text-muted"}`}>{f.severity}</span>
                  <span className="rounded-pill px-2.5 py-0.5 text-muted shadow-hairline">{f.category}</span>
                  {f.certainty === "inferred" && <span className="rounded-pill px-2.5 py-0.5 text-muted shadow-hairline">likely</span>}
                </div>
                <p className="mt-3 font-semibold">{f.title}</p>
                <p className="mt-1 text-[15px] text-muted">{f.evidence}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No on-page issues found{audit.findings ? "" : " (the page couldn't be read directly)"}.</p>
        )}
      </section>

      <section aria-labelledby="next-h" className="container-x pb-[clamp(56px,8vw,112px)]">
        <h2 id="next-h" className="display !text-[clamp(28px,3vw,40px)]">
          Want these fixed?
        </h2>
        <p className="mt-4 max-w-[52ch] text-fg/85">Reply to the email with this report, or send us a message. We&apos;ll tell you which fixes matter most and what they cost.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button href="/contact" variant="accent">
            Talk to us
          </Button>
          <Button href="/#audit" variant="ghost">
            Audit another site
          </Button>
        </div>
      </section>
    </main>
  );
}
