import { requireAdmin } from "@/lib/auth";
import type { Plan } from "@/lib/billing";
import PlanRow from "./PlanRow";

export const metadata = { title: "Plans" };

/** Plans = the single source of prices: marketing cards (via cms_published_all), checkout and invoices all read them. */
export default async function AdminPlans() {
  const { supabase } = await requireAdmin();
  const { data: plans } = await supabase.from("plans").select("*").order("sort").returns<Plan[]>();
  return (
    <div>
      <p className="mb-8 max-w-[640px] text-[15px] leading-relaxed text-muted">
        Amounts are before tax. India plans add GST at checkout and bill through Razorpay. International plans bill in USD through Stripe. Changes apply to the
        pricing page immediately.
      </p>
      <ul className="grid gap-4 lg:grid-cols-2">
        {plans?.map((p, i) => (
          <PlanRow key={p.id} plan={p} delay={i * 50} />
        ))}
      </ul>
    </div>
  );
}
