import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { StatTile } from "@/components/app/AppShell";
import InvoiceTable, { type InvoiceRow } from "@/components/app/InvoiceTable";
import RecordsView from "@/components/admin/RecordsView";
import { loadOptions, loadRows } from "@/components/admin/ResourcePage";
import { requireAdmin, type Profile } from "@/lib/auth";
import { formatMinor } from "@/lib/billing";

export const metadata = { title: "Client" };

/** One client: their projects, subscriptions and tickets (editable in place, pre-linked) and invoices. */
export default async function ClientDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { supabase } = await requireAdmin();
  const [{ data: p }, projects, subs, tickets, { data: invoices }, options] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", id).maybeSingle<Profile>(),
    loadRows(supabase, "projects", id),
    loadRows(supabase, "subscriptions", id),
    loadRows(supabase, "tickets", id),
    supabase.from("invoices").select("id, number, email, plan_id, provider, currency, total_minor, status, created_at").eq("user_id", id).order("created_at", { ascending: false }).returns<InvoiceRow[]>(),
    loadOptions(supabase),
  ]);
  if (!p) notFound();

  const paid = (invoices ?? []).filter((i) => i.status === "paid");
  const totals = Object.entries(paid.reduce<Record<string, number>>((m, i) => ((m[i.currency] = (m[i.currency] ?? 0) + i.total_minor), m), {}));
  const defaults = { client_id: id };
  const section = "mt-14 [&>h3]:mb-4 [&>h3]:text-xl [&>h3]:font-medium [&>h3]:tracking-[-0.02em]";

  return (
    <div>
      <Link href="/admin/clients" className="mb-6 inline-flex min-h-[44px] items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} aria-hidden="true" /> All clients
      </Link>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">{p.full_name || p.email}</h2>
      <p className="mt-1 text-sm text-muted">
        {p.email} · {p.region === "IN" ? "India" : "International"} · {p.role} · joined {new Date(p.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatTile label="Projects" value={String(projects.length)} delay={40} />
        <StatTile label="Active subscriptions" value={String(subs.filter((s) => s.status === "active").length)} delay={100} />
        <StatTile label="Total paid" value={totals.map(([c, v]) => formatMinor(v, c)).join(" + ") || "—"} delay={160} />
      </div>
      <section className={section}>
        <h3>Projects</h3>
        <RecordsView kind="projects" rows={projects} options={options} defaults={defaults} />
      </section>
      <section className={section}>
        <h3>Subscriptions</h3>
        <RecordsView kind="subscriptions" rows={subs} options={options} defaults={{ ...defaults, started_at: new Date().toISOString().slice(0, 10), currency: p.region === "IN" ? "INR" : "USD" }} />
      </section>
      <section className={section}>
        <h3>Tickets & requests</h3>
        <RecordsView kind="tickets" rows={tickets} options={options} defaults={defaults} />
      </section>
      <section className={section}>
        <h3>Invoices</h3>
        <InvoiceTable rows={invoices ?? []} />
      </section>
    </div>
  );
}
