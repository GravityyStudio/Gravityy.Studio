import { StatTile } from "@/components/app/AppShell";
import { requireUser } from "@/lib/auth";
import { formatMinor } from "@/lib/billing";
import type { Milestone } from "@/lib/resources";

export const metadata = { title: "Reports" };

type Inv = { total_minor: number; currency: string; status: string; created_at: string };
type Proj = { status: string; progress: number; milestones: Milestone[] };
type Tix = { kind: string; status: string; created_at: string; updated_at: string };

/** Last 12 calendar months, oldest first: ["2025-11", …, "2026-10"]. */
function months(now = new Date()) {
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 11 + i, 1));
    return d.toISOString().slice(0, 7);
  });
}

/** Account reports from the client's own rows only: spend by month, delivery progress, support stats. */
export default async function PortalReports() {
  const { supabase } = await requireUser("/portal/reports");
  const [{ data: invoices }, { data: projects }, { data: tickets }] = await Promise.all([
    supabase.from("invoices").select("total_minor, currency, status, created_at").eq("status", "paid").returns<Inv[]>(),
    supabase.from("projects").select("status, progress, milestones").returns<Proj[]>(),
    supabase.from("tickets").select("kind, status, created_at, updated_at").returns<Tix[]>(),
  ]);

  // Spend chart: one series in the currency you pay most in (mixing ₹ and $ on one axis would mislead).
  const paid = invoices ?? [];
  const byCur = paid.reduce<Record<string, number>>((m, i) => ((m[i.currency] = (m[i.currency] ?? 0) + i.total_minor), m), {});
  const currency = Object.entries(byCur).sort((a, b) => b[1] - a[1])[0]?.[0];
  const series = months().map((m) => ({ m, v: paid.filter((i) => i.currency === currency && i.created_at.startsWith(m)).reduce((s, i) => s + i.total_minor, 0) }));
  const max = Math.max(1, ...series.map((s) => s.v));

  const ms = (projects ?? []).flatMap((p) => (Array.isArray(p.milestones) ? p.milestones : []));
  const avg = projects?.length ? Math.round(projects.reduce((s, p) => s + p.progress, 0) / projects.length) : 0;
  const t = tickets ?? [];
  const closed = t.filter((x) => x.status === "resolved" || x.status === "closed");
  const days = closed.length ? closed.reduce((s, x) => s + (+new Date(x.updated_at) - +new Date(x.created_at)), 0) / closed.length / 864e5 : null;

  return (
    <div className="flex flex-col gap-14">
      <section aria-labelledby="spend-h">
        <h2 id="spend-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          Spend
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <StatTile label="Total paid" value={Object.entries(byCur).map(([c, v]) => formatMinor(v, c)).join(" + ") || "—"} delay={40} />
          <StatTile label="Paid invoices" value={String(paid.length)} delay={100} />
        </div>
        {currency ? (
          <figure className="card mt-4 p-5 sm:p-6">
            <figcaption className="mb-5 text-sm text-muted">Paid per month, last 12 months ({currency})</figcaption>
            {/* Bars + a value under each = the chart doubles as its own data table; title gives the hover readout. */}
            <ol className="grid h-48 grid-cols-12 items-end gap-1.5 sm:gap-2" aria-label={`Monthly spend in ${currency}`}>
              {series.map(({ m, v }, i) => {
                const label = new Date(`${m}-01T00:00:00Z`).toLocaleDateString("en-IN", { month: "short", timeZone: "UTC" });
                return (
                  <li key={m} className="group flex h-full flex-col justify-end gap-2" title={`${label}: ${formatMinor(v, currency)}`}>
                    <span
                      className="rise block min-h-[2px] rounded-t-[4px] bg-accent transition-opacity group-hover:opacity-80"
                      style={{ height: `${(v / max) * 100}%`, opacity: v ? 1 : 0.25, animationDelay: `${i * 30}ms` }}
                    />
                    <span className="text-center font-mono text-[10px] uppercase text-muted">{label}</span>
                    <span className="sr-only">{formatMinor(v, currency)}</span>
                  </li>
                );
              })}
            </ol>
          </figure>
        ) : (
          <p className="card mt-4 p-6 text-sm text-muted">No payments yet. Monthly spend appears here after your first invoice.</p>
        )}
      </section>

      <section aria-labelledby="delivery-h">
        <h2 id="delivery-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          Delivery
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Projects" value={String(projects?.length ?? 0)} hint={`${(projects ?? []).filter((p) => p.status === "delivered").length} delivered`} delay={40} />
          <StatTile label="Average progress" value={projects?.length ? `${avg}%` : "—"} delay={100} />
          <StatTile label="Milestones done" value={ms.length ? `${ms.filter((m) => m.done).length}/${ms.length}` : "—"} delay={160} />
        </div>
      </section>

      <section aria-labelledby="support-h">
        <h2 id="support-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          Support
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatTile label="Service requests" value={String(t.filter((x) => x.kind === "request").length)} delay={40} />
          <StatTile label="Support tickets" value={String(t.filter((x) => x.kind === "support").length)} hint={`${t.filter((x) => x.status === "open" || x.status === "in_progress").length} open`} delay={100} />
          <StatTile label="Avg. time to resolve" value={days === null ? "—" : days < 1 ? "< 1 day" : `${days.toFixed(1)} days`} delay={160} />
        </div>
      </section>
    </div>
  );
}
