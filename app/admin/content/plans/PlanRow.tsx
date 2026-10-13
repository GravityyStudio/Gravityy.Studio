"use client";
import { useActionState, useState } from "react";
import { updatePlan, type Result } from "@/app/admin/actions";
import { formatMinor, planTotals, type Plan } from "@/lib/billing";
import Button from "@/components/ui/Button";

export default function PlanRow({ plan, delay }: { plan: Plan; delay: number }) {
  const [state, action, pending] = useActionState<Result, FormData>(updatePlan, {});
  const [amount, setAmount] = useState(plan.amount_minor / 100);
  const [gst, setGst] = useState(Math.round(plan.gst_rate * 10000) / 100);
  const preview = planTotals({ amount_minor: Math.round(amount * 100) || 0, gst_rate: gst / 100 });

  return (
    <li className="card rise p-6" style={{ animationDelay: `${delay}ms` }}>
      <form action={action} className="flex flex-col gap-5">
        <input type="hidden" name="id" value={plan.id} />
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-medium">{plan.name}</h2>
            <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
              {plan.id} · {plan.region} · {plan.interval === "month" ? "monthly" : "one-time"}
            </p>
          </div>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={plan.active} className="h-4 w-4 accent-[rgb(var(--accent))]" />
            Active
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-2 text-sm font-medium">
            Amount ({plan.currency})
            <input name="amount" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="field tabular-nums" />
          </label>
          <label className="flex flex-col gap-2 text-sm font-medium">
            GST %
            <input name="gst" type="number" step="0.01" min="0" max="99" value={gst} onChange={(e) => setGst(Number(e.target.value))} className="field tabular-nums" />
          </label>
        </div>
        <p className="text-sm text-muted">
          Customer pays <span className="font-medium text-fg tabular-nums">{formatMinor(preview.total, plan.currency)}</span>
          {preview.tax ? ` (incl. ${formatMinor(preview.tax, plan.currency)} GST)` : ""}
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" variant="ghost" disabled={pending}>
            {pending ? "Saving…" : "Save plan"}
          </Button>
          <p role="status" className={`text-sm ${state.error ? "text-danger" : "text-accent"}`}>
            {state.error ?? (state.ok ? "Saved." : "")}
          </p>
        </div>
      </form>
    </li>
  );
}
