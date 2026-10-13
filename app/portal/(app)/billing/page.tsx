import Link from "@/components/ui/SmartLink";
import Button from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { formatMinor, planTotals, providerFor, type Plan } from "@/lib/billing";
import { human } from "@/lib/resources";
import { badge, shortDate } from "../../TicketList";
import { portalRegion } from "../../region";

export const metadata = { title: "Plan & billing" };

type Sub = { id: string; plan_id: string | null; status: string; amount_minor: number; currency: string; interval: string; provider: string; current_period_end: string | null };
const h2 = "mb-5 text-2xl font-medium tracking-[-0.03em]";

export default async function PortalBilling() {
  const { supabase, profile } = await requireUser("/portal/billing");
  const region = await portalRegion(profile.region);
  const [{ data: subs }, { data: plans }] = await Promise.all([
    supabase.from("subscriptions").select("id, plan_id, status, amount_minor, currency, interval, provider, current_period_end").neq("status", "cancelled").returns<Sub[]>(),
    supabase.from("plans").select("*").order("sort").returns<Plan[]>(),
  ]);
  const forRegion = (plans ?? []).filter((p) => p.region === region && p.active);

  return (
    <div className="flex flex-col gap-14">
      <section aria-labelledby="sub-h">
        <h2 id="sub-h" className={h2}>
          Your plan
        </h2>
        {subs?.length ? (
          <ul className="grid gap-4 sm:grid-cols-2">
            {subs.map((s) => (
              <li key={s.id} className="card flex flex-col gap-2 p-6">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-medium">{plans?.find((p) => p.id === s.plan_id)?.name ?? "Retainer"}</h3>
                  <span className={`${badge} ${s.status === "active" ? "border-accent/50 text-accent" : ""}`}>{human(s.status)}</span>
                </div>
                <p className="text-3xl font-medium tracking-[-0.03em] tabular-nums">
                  {formatMinor(s.amount_minor, s.currency)}
                  <span className="text-sm font-normal text-muted"> / {s.interval}</span>
                </p>
                <p className="text-[13px] text-muted">
                  {s.current_period_end ? `Paid through ${shortDate(s.current_period_end)}` : "Billed by arrangement"} · {s.provider === "manual" ? "Invoiced by the studio" : human(s.provider)}
                </p>
              </li>
            ))}
          </ul>
        ) : (
          <div className="card flex flex-col items-start gap-4 p-6 sm:p-8">
            <p className="text-muted">No plan yet. Pick a build or a monthly Grow plan below, or compare everything on the pricing page.</p>
            <Button href="/pricing" variant="accent">
              Choose a plan
            </Button>
          </div>
        )}
      </section>

      <section aria-labelledby="plans-h">
        <h2 id="plans-h" className={h2}>
          Plans for {region === "IN" ? "India" : "international clients"}
        </h2>
        <p className="-mt-3 mb-5 text-sm text-muted">
          Payments via {providerFor(region) === "razorpay" ? "Razorpay (INR + GST)" : "Stripe (USD)"}. Billing region is set in{" "}
          <Link href="/portal/settings" className="underline underline-offset-4 hover:text-fg">
            Settings
          </Link>
          .
        </p>
        <ul className="grid gap-4 sm:grid-cols-2">
          {forRegion.map((p, k) => {
            const t = planTotals(p);
            return (
              <li key={p.id} className="card rise flex flex-col gap-4 p-6" style={{ animationDelay: `${k * 60}ms` }}>
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium">{p.name}</h3>
                  <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{p.interval === "month" ? "Monthly" : "One-time"}</span>
                </div>
                <p className="text-3xl font-medium tracking-[-0.03em] tabular-nums">{formatMinor(p.amount_minor, p.currency)}</p>
                <p className="text-[13px] text-muted">{t.tax ? `+ ${Math.round(p.gst_rate * 100)}% GST · ${formatMinor(t.total, p.currency)} total` : "No tax added"}</p>
                <Button href={`/pricing/checkout?plan=${p.id}`} variant={p.interval === "month" ? "accent" : "primary"} className="mt-auto w-full">
                  Buy {p.name}
                </Button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
