import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { StatTile } from "@/components/app/AppShell";
import InvoiceTable, { type InvoiceRow } from "@/components/app/InvoiceTable";
import { requireAdmin } from "@/lib/auth";
import { formatMinor } from "@/lib/billing";
import { STAGES, human } from "@/lib/resources";

type Money = { currency: string; minor: number };
const sum = (rows: Money[]) =>
  Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[r.currency] = (m[r.currency] ?? 0) + r.minor), m), {}))
    .filter(([, v]) => v)
    .map(([c, v]) => formatMinor(Math.round(v), c))
    .join(" + ") || "—";

type Sub = { amount_minor: number; currency: string; interval: string };
type Lead = { stage: string; value_minor: number; currency: string };
type Audit = { id: number; actor_email: string | null; action: string; entity: string; entity_id: string | null; created_at: string };

function Heading({ id, title, href, link }: { id: string; title: string; href: string; link: string }) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <h2 id={id} className="text-2xl font-medium tracking-[-0.03em]">{title}</h2>
      <Link href={href} className="inline-flex min-h-[40px] items-center gap-1 text-sm font-medium hover:text-accent">
        {link} <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </div>
  );
}

/** Every figure is computed from live rows (RLS: admin reads all). MRR = active subscriptions, yearly ÷ 12. */
export default async function AdminOverview() {
  const { supabase } = await requireAdmin();
  const [{ data: subs }, { count: openTickets }, { data: leads }, { data: invoices }, { data: log }] = await Promise.all([
    supabase.from("subscriptions").select("amount_minor, currency, interval").eq("status", "active").returns<Sub[]>(),
    supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("leads").select("stage, value_minor, currency").returns<Lead[]>(),
    supabase.from("invoices").select("id, number, email, plan_id, provider, currency, total_minor, status, created_at").order("created_at", { ascending: false }).limit(6).returns<InvoiceRow[]>(),
    supabase.from("audit_log").select("id, actor_email, action, entity, entity_id, created_at").order("created_at", { ascending: false }).limit(8).returns<Audit[]>(),
  ]);

  const mrr = sum((subs ?? []).map((s) => ({ currency: s.currency, minor: s.interval === "year" ? s.amount_minor / 12 : s.amount_minor })));
  const byStage = STAGES.map((stage) => {
    const rows = (leads ?? []).filter((l) => l.stage === stage);
    return { stage, count: rows.length, value: sum(rows.map((l) => ({ currency: l.currency, minor: l.value_minor }))) };
  });
  const max = Math.max(1, ...byStage.map((s) => s.count));
  const open = (leads ?? []).filter((l) => l.stage !== "won" && l.stage !== "lost");

  return (
    <div className="flex flex-col gap-14">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="MRR" value={mrr} hint="Active subscriptions" delay={40} />
        <StatTile label="Active subscriptions" value={String(subs?.length ?? 0)} delay={100} />
        <StatTile label="Open tickets" value={String(openTickets ?? 0)} hint="Open + in progress" delay={160} />
        <StatTile label="Open pipeline" value={sum(open.map((l) => ({ currency: l.currency, minor: l.value_minor })))} hint={`${open.length} leads in play`} delay={220} />
      </div>

      <section aria-labelledby="pipe-h">
        <Heading id="pipe-h" title="Lead pipeline" href="/admin/leads" link="Open board" />
        <ul className="card stagger flex flex-col gap-4 p-5 sm:p-6">
          {byStage.map((s, i) => (
            <li key={s.stage} className="grid grid-cols-[96px_1fr_auto] items-center gap-4 text-sm sm:grid-cols-[120px_1fr_200px]">
              <span className={s.stage === "won" ? "text-accent" : "text-muted"}>{human(s.stage)}</span>
              <span className="h-2 overflow-hidden rounded-full bg-raised">
                <span
                  className={`bar-grow block h-full rounded-full ${s.stage === "lost" ? "bg-fg/25" : "bg-accent"}`}
                  style={{ width: `${(s.count / max) * 100}%`, animationDelay: `${200 + i * 60}ms` }}
                />
              </span>
              <span className="text-right tabular-nums">
                {s.count} <span className="hidden text-muted sm:inline">· {s.value}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-14 xl:grid-cols-[1.5fr_1fr] xl:gap-8">
        <section aria-labelledby="recent-h" className="min-w-0">
          <Heading id="recent-h" title="Recent invoices" href="/admin/invoices" link="All invoices" />
          <InvoiceTable rows={invoices ?? []} />
        </section>
        <section aria-labelledby="audit-h" className="min-w-0">
          <Heading id="audit-h" title="Recent activity" href="/admin/audit-log" link="Audit log" />
          <ol className="card stagger divide-y divide-line">
            {(log ?? []).map((a) => (
              <li key={a.id} className="flex flex-col gap-0.5 px-5 py-3 text-sm">
                <span>
                  <span className="font-medium">{human(a.action)}</span> <span className="text-muted">{a.entity}</span>
                </span>
                <span className="truncate text-[13px] text-muted">
                  {a.actor_email ?? "System"} · {new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                </span>
              </li>
            ))}
            {!log?.length && <li className="px-5 py-10 text-center text-sm text-muted">No activity yet.</li>}
          </ol>
        </section>
      </div>
    </div>
  );
}
