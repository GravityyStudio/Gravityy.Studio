import type { ReactNode } from "react";
import { ArrowUpRight, BarChart3, CircleCheck, FolderKanban, LifeBuoy, Plus, Receipt, Send, Wallet } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import Button from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { formatMinor } from "@/lib/billing";

export const metadata = { title: "Overview" };

type Sub = { plan_id: string | null; amount_minor: number; currency: string; interval: string };
type Inv = { id: string; number: number; total_minor: number; currency: string; created_at: string };

function Tile({ icon, label, href, link, children, delay }: { icon: ReactNode; label: string; href: string; link: string; children: ReactNode; delay: number }) {
  return (
    <section className="card rise flex flex-col gap-4 p-6" style={{ animationDelay: `${delay}ms` }}>
      <p className="flex items-center gap-2 text-[13px] text-muted">
        {icon}
        {label}
      </p>
      <div className="flex-1">{children}</div>
      <Link href={href} className="inline-flex min-h-[40px] w-fit items-center gap-1 text-sm font-medium hover:text-accent">
        {link} <ArrowUpRight size={14} aria-hidden="true" />
      </Link>
    </section>
  );
}

const QUICK: [string, string, typeof Send][] = [
  ["Request work", "/portal/requests", Send],
  ["New service request", "/portal/requests#new", Plus],
  ["Get support", "/portal/tickets#new", LifeBuoy],
  ["View reports", "/portal/reports", BarChart3],
];
const big = "text-[clamp(26px,3vw,34px)] font-medium tracking-[-0.03em] tabular-nums";

/** Plan, open tickets, latest invoice and active projects at a glance (RLS: own rows only). */
export default async function PortalOverview({ searchParams }: { searchParams: Promise<{ paid?: string; denied?: string }> }) {
  const sp = await searchParams;
  const { supabase } = await requireUser("/portal");
  const [{ data: subs }, { count: openTickets }, { data: invoices }, { count: activeProjects }, { data: plans }] = await Promise.all([
    supabase.from("subscriptions").select("plan_id, amount_minor, currency, interval").eq("status", "active").returns<Sub[]>(),
    supabase.from("tickets").select("id", { count: "exact", head: true }).in("status", ["open", "in_progress"]),
    supabase.from("invoices").select("id, number, total_minor, currency, created_at").order("created_at", { ascending: false }).limit(1).returns<Inv[]>(),
    supabase.from("projects").select("id", { count: "exact", head: true }).neq("status", "delivered"),
    supabase.from("plans").select("id, name").returns<{ id: string; name: string }[]>(),
  ]);
  const sub = subs?.[0];
  const latest = invoices?.[0];

  return (
    <div className="flex flex-col gap-12">
      {sp.paid && (
        <p role="status" className="rise flex items-center gap-3 rounded-2xl border border-accent/40 bg-hi p-4 text-sm">
          <CircleCheck size={18} className="shrink-0 text-accent" aria-hidden="true" />
          Payment received. Your invoice appears under Invoices as soon as the payment provider confirms it (usually a few seconds).
        </p>
      )}
      {sp.denied && (
        <p role="alert" className="rise rounded-2xl border border-danger/40 p-4 text-sm text-danger">
          That area is for admins only.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
        <Tile icon={<Wallet size={14} aria-hidden="true" />} label="Plan" href="/portal/billing" link="Plan & billing" delay={40}>
          {sub ? (
            <>
              <p className={big}>{plans?.find((p) => p.id === sub.plan_id)?.name ?? "Retainer"}</p>
              <p className="mt-1 text-sm text-muted">
                {formatMinor(sub.amount_minor, sub.currency)} / {sub.interval}
                {subs!.length > 1 && ` · +${subs!.length - 1} more`}
              </p>
            </>
          ) : (
            <>
              <p className={big}>None yet</p>
              <div className="mt-4">
                <Button href="/pricing" variant="accent">
                  Choose a plan
                </Button>
              </div>
            </>
          )}
        </Tile>
        <Tile icon={<LifeBuoy size={14} aria-hidden="true" />} label="Open tickets" href="/portal/tickets" link="Support tickets" delay={100}>
          <p className={big}>{openTickets ?? 0}</p>
        </Tile>
        <Tile icon={<Receipt size={14} aria-hidden="true" />} label="Latest invoice" href={latest ? `/portal/invoices/${latest.id}` : "/portal/invoices"} link={latest ? `View #${latest.number}` : "Invoices"} delay={160}>
          {latest ? (
            <>
              <p className={big}>{formatMinor(latest.total_minor, latest.currency)}</p>
              <p className="mt-1 text-sm text-muted">{new Date(latest.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</p>
            </>
          ) : (
            <p className={big}>None yet</p>
          )}
        </Tile>
        <Tile icon={<FolderKanban size={14} aria-hidden="true" />} label="Active projects" href="/portal/projects" link="Projects" delay={220}>
          <p className={big}>{activeProjects ? activeProjects : "None active"}</p>
        </Tile>
      </div>

      <section aria-labelledby="quick-h">
        <h2 id="quick-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          Quick actions
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {QUICK.map(([label, href, Icon], i) => (
            <li key={href} className="rise" style={{ animationDelay: `${280 + i * 50}ms` }}>
              <Link href={href} className="card group flex min-h-[88px] items-center justify-between gap-3 p-5 transition-colors hover:border-line-strong">
                <span className="flex items-center gap-3 font-medium">
                  <Icon size={18} aria-hidden="true" className="text-accent" />
                  {label}
                </span>
                <ArrowUpRight size={16} aria-hidden="true" className="text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
