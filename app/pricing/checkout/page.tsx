import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { requireUser } from "@/lib/auth";
import { formatMinor, planTotals, providerFor, type Plan } from "@/lib/billing";
import { getContent } from "@/lib/content";
import PayButton from "./PayButton";

// Per-user (session cookies + RLS): never prerender or cache.
export const dynamic = "force-dynamic";

export const metadata = { title: "Checkout", robots: { index: false, follow: false } };

export default async function CheckoutPage({ searchParams }: { searchParams: Promise<{ plan?: string; cancelled?: string }> }) {
  const { plan: planId = "", cancelled } = await searchParams;
  const { supabase, profile } = await requireUser(`/pricing/checkout?plan=${encodeURIComponent(planId)}`);
  // Price from plans (server-side): the summary below is exactly what the provider will charge.
  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).eq("active", true).maybeSingle<Plan>();
  if (!plan) notFound();
  const t = planTotals(plan);
  const provider = providerFor(plan.region);
  const card = Object.values((await getContent()).pricing)
    .flat()
    .find((c) => (c as { planId?: string }).planId === plan.id);

  return (
    <main id="main" className="container-x min-h-[100svh] pb-section pt-[clamp(120px,14vw,160px)]">
      <Link href="/pricing" className="rise mb-8 inline-flex min-h-[44px] items-center gap-2 text-sm text-muted hover:text-fg">
        <ArrowLeft size={16} aria-hidden="true" /> Back to pricing
      </Link>
      <div className="grid gap-5 lg:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="co-h" className="card rise p-7 sm:p-10">
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">Checkout</p>
          <h1 id="co-h" className="mt-3 text-[clamp(36px,5vw,56px)] font-medium leading-none tracking-[-0.04em]">
            {plan.name}
          </h1>
          {card && <p className="mt-4 max-w-[520px] text-[15px] leading-relaxed text-muted">{card.desc}</p>}
          {card && (
            <ul className="mt-8 grid gap-3 border-t border-line pt-8 sm:grid-cols-2">
              {card.features.map((f) => (
                <li key={f} className="flex gap-3 text-[15px]">
                  <ShieldCheck size={18} className="mt-px shrink-0 text-accent" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside aria-label="Order summary" className="glass rise flex h-fit flex-col gap-6 rounded-card border border-line p-7 sm:p-10" style={{ animationDelay: "100ms" }}>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Order summary</p>
          <dl className="flex flex-col gap-3 text-[15px]">
            <div className="flex justify-between gap-4">
              <dt className="text-muted">{plan.interval === "month" ? "First month" : "One-time project"}</dt>
              <dd className="tabular-nums">{formatMinor(t.subtotal, plan.currency)}</dd>
            </div>
            {t.tax > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted">GST {Math.round(plan.gst_rate * 100)}%</dt>
                <dd className="tabular-nums">{formatMinor(t.tax, plan.currency)}</dd>
              </div>
            )}
            <div className="flex items-baseline justify-between gap-4 border-t border-line pt-4">
              <dt className="font-medium">Total due today</dt>
              <dd className="text-3xl font-medium tracking-[-0.03em] tabular-nums">{formatMinor(t.total, plan.currency)}</dd>
            </div>
          </dl>
          {cancelled && <p className="text-sm text-muted">Payment was cancelled. You can try again whenever you&apos;re ready.</p>}
          <PayButton planId={plan.id} label={`Pay ${formatMinor(t.total, plan.currency)}`} />
          <p className="flex items-start gap-2 text-[13px] leading-relaxed text-muted">
            <ShieldCheck size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            Secure payment via {provider === "razorpay" ? "Razorpay (cards, UPI, netbanking · INR)" : "Stripe (cards · USD)"}. Signed in as {profile.email}. Your invoice is emailed and
            appears in your portal once payment is confirmed.
          </p>
        </aside>
      </div>
    </main>
  );
}
