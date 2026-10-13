import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import BrandMark from "@/components/ui/BrandMark";
import PrintButton from "@/components/app/PrintButton";
import { requireUser } from "@/lib/auth";
import { formatMinor, type Plan } from "@/lib/billing";

// Per-user (session cookies + RLS): never prerender or cache.
export const dynamic = "force-dynamic";

export const metadata = { title: "Invoice", robots: { index: false, follow: false } };

type Invoice = {
  id: string;
  number: number;
  email: string | null;
  provider: string;
  provider_ref: string;
  currency: string;
  subtotal_minor: number;
  tax_minor: number;
  total_minor: number;
  status: string;
  created_at: string;
  snapshot: { plan: Plan };
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase } = await requireUser(`/portal/invoices/${id}`);
  // RLS: returns nothing unless the invoice belongs to this user (or they're an admin).
  const { data: inv } = await supabase.from("invoices").select("*").eq("id", id).maybeSingle<Invoice>();
  if (!inv) notFound();
  const plan = inv.snapshot.plan;
  const rows: [string, string][] = [
    [`${plan.name}${plan.interval === "month" ? " (monthly, first month)" : ""}`, formatMinor(inv.subtotal_minor, inv.currency)],
    ...(inv.tax_minor ? ([[`GST ${Math.round(plan.gst_rate * 100)}%`, formatMinor(inv.tax_minor, inv.currency)]] as [string, string][]) : []),
  ];

  return (
    <main id="main" className="container-x min-h-[100svh] pb-section pt-[clamp(120px,14vw,160px)] print:p-0">
      <div className="mx-auto max-w-[760px]">
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link href="/portal/invoices" className="inline-flex min-h-[44px] items-center gap-2 text-sm text-muted hover:text-fg">
            <ArrowLeft size={16} aria-hidden="true" /> All invoices
          </Link>
          <PrintButton />
        </div>
        <article className="card rise p-7 sm:p-12 print:border-0">
          <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
            <div className="flex items-center gap-3">
              <BrandMark height={28} />
              <div>
                <p className="font-semibold">Gravityy Studio</p>
                <p className="text-sm text-muted">hello@gravityystudio.com</p>
              </div>
            </div>
            <div className="text-right">
              <h1 className="text-3xl font-medium tracking-[-0.03em]">Invoice #{inv.number}</h1>
              <p className="mt-1 text-sm text-muted">{new Date(inv.created_at).toLocaleDateString("en-IN", { dateStyle: "long" })}</p>
              <span className="mt-3 inline-block rounded-full border border-accent/50 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">{inv.status}</span>
            </div>
          </header>
          <dl className="grid gap-6 border-b border-line py-8 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-muted">Billed to</dt>
              <dd className="mt-1">{inv.email ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Payment</dt>
              <dd className="mt-1 capitalize">
                {inv.provider} · <span className="font-mono text-xs">{inv.provider_ref}</span>
              </dd>
            </div>
          </dl>
          <table className="w-full text-sm">
            <tbody>
              {rows.map(([k, v]) => (
                <tr key={k} className="border-b border-line">
                  <td className="py-4">{k}</td>
                  <td className="py-4 text-right tabular-nums">{v}</td>
                </tr>
              ))}
              <tr>
                <td className="pt-6 text-base font-medium">Total paid</td>
                <td className="pt-6 text-right text-2xl font-medium tabular-nums">{formatMinor(inv.total_minor, inv.currency)}</td>
              </tr>
            </tbody>
          </table>
        </article>
      </div>
    </main>
  );
}
