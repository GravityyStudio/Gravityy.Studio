import { formatMinor, planTotals, type Plan } from "./billing";
import { createSupabaseService } from "./supabase/service";
import { sendInvoiceEmail } from "./email";
import { audit } from "./audit";
import { SITE } from "./seo";

// ---------- Providers (REST via fetch: no SDKs) ----------

/** Stripe Checkout Session (GLOBAL · USD). Amount comes from the plans table, never from the browser. */
export async function createStripeSession(plan: Plan, user: { id: string; email: string }) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("Stripe is not configured (STRIPE_SECRET_KEY).");
  const { total } = planTotals(plan);
  const body = new URLSearchParams({
    mode: "payment",
    success_url: `${SITE}/portal?paid=1`,
    cancel_url: `${SITE}/pricing/checkout?plan=${plan.id}&cancelled=1`,
    customer_email: user.email,
    client_reference_id: user.id,
    "metadata[user_id]": user.id,
    "metadata[plan_id]": plan.id,
    "line_items[0][quantity]": "1",
    "line_items[0][price_data][currency]": plan.currency.toLowerCase(),
    "line_items[0][price_data][unit_amount]": String(total),
    "line_items[0][price_data][product_data][name]": `${plan.name}${plan.interval === "month" ? " (first month)" : ""}`,
  });
  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json()) as { url?: string; error?: { message: string } };
  if (!res.ok || !json.url) throw new Error(json.error?.message ?? `Stripe responded ${res.status}`);
  return json.url;
}

/** Razorpay Order (IN · INR + GST). The browser opens Razorpay Checkout for this order id. */
export async function createRazorpayOrder(plan: Plan, user: { id: string }) {
  const id = process.env.RAZORPAY_KEY_ID;
  const secret = process.env.RAZORPAY_KEY_SECRET;
  if (!id || !secret) throw new Error("Razorpay is not configured (RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET).");
  const { total } = planTotals(plan);
  const res = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/json" },
    body: JSON.stringify({ amount: total, currency: plan.currency, receipt: `gs_${Date.now()}`, notes: { user_id: user.id, plan_id: plan.id } }),
  });
  const json = (await res.json()) as { id?: string; error?: { description: string } };
  if (!res.ok || !json.id) throw new Error(json.error?.description ?? `Razorpay responded ${res.status}`);
  return { orderId: json.id, keyId: id, amount: total, currency: plan.currency };
}

// ---------- Webhook → invoice + snapshot → subscription → email ----------

const plusMonth = (from: Date) => {
  const d = new Date(from);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
};

/** A paid monthly plan starts (or extends by one month) the client's live subscription for it → MRR on the admin overview. */
async function renewSubscription(db: ReturnType<typeof createSupabaseService>, plan: Plan, p: Paid) {
  const { data: live } = await db
    .from("subscriptions")
    .select("id, current_period_end")
    .eq("client_id", p.userId!)
    .eq("plan_id", plan.id)
    .neq("status", "cancelled")
    .maybeSingle<{ id: string; current_period_end: string | null }>();
  const now = new Date();
  const base = live?.current_period_end && new Date(live.current_period_end) > now ? new Date(live.current_period_end) : now;
  const row = { status: "active", amount_minor: plan.amount_minor, currency: plan.currency, provider: p.provider, provider_ref: p.providerRef, current_period_end: plusMonth(base), updated_at: now.toISOString() };
  const { data, error } = live
    ? await db.from("subscriptions").update(row).eq("id", live.id).select("id").single<{ id: string }>()
    : await db.from("subscriptions").insert({ ...row, client_id: p.userId, plan_id: plan.id, interval: "month" }).select("id").single<{ id: string }>();
  if (error) return console.error("[billing] subscription not updated", error.message);
  await audit(db, null, live ? "renew" : "create", "subscriptions", data.id, { plan: plan.id, until: row.current_period_end });
}

type Paid = {
  provider: "stripe" | "razorpay";
  eventId: string; // idempotency key
  providerRef: string; // Stripe session id / Razorpay payment id
  userId?: string;
  planId?: string;
  email?: string;
  amountPaid: number; // minor units, as reported by the provider
  currency: string;
};

/** Idempotent: a replayed webhook (same event id or same provider ref) is acknowledged and ignored. */
export async function recordPayment(p: Paid): Promise<"recorded" | "duplicate" | "ignored"> {
  const db = createSupabaseService();

  const { error: dupErr } = await db.from("webhook_events").insert({ provider: p.provider, event_id: p.eventId });
  if (dupErr) {
    if (dupErr.code === "23505") return "duplicate";
    throw dupErr;
  }
  if (!p.planId) return "ignored";

  const { data: plan } = await db.from("plans").select("*").eq("id", p.planId).single<Plan>();
  if (!plan) return "ignored";
  const t = planTotals(plan);
  if (t.total !== p.amountPaid) console.warn(`[billing] ${p.provider} ${p.providerRef}: paid ${p.amountPaid} ≠ plan total ${t.total}`);

  let email = p.email;
  if (!email && p.userId) email = (await db.from("profiles").select("email").eq("id", p.userId).single<{ email: string }>()).data?.email;

  const snapshot = { plan, totals: t, amount_paid: p.amountPaid, paid_currency: p.currency, recorded_at: new Date().toISOString() };
  const { data: inv, error } = await db
    .from("invoices")
    .insert({
      user_id: p.userId ?? null,
      email: email ?? null,
      plan_id: plan.id,
      provider: p.provider,
      provider_ref: p.providerRef,
      currency: plan.currency,
      subtotal_minor: t.subtotal,
      tax_minor: t.tax,
      total_minor: p.amountPaid,
      snapshot,
    })
    .select("id, number")
    .single<{ id: string; number: number }>();
  if (error) {
    if (error.code === "23505") return "duplicate";
    throw error;
  }

  await audit(db, null, "payment", "invoices", inv.id, { provider: p.provider, plan: plan.id, amount: p.amountPaid, currency: plan.currency });
  if (plan.interval === "month" && p.userId) await renewSubscription(db, plan, p);

  if (email) {
    const lines: [string, string][] = [
      ["Plan", `${plan.name}${plan.interval === "month" ? " (monthly, first month)" : ""}`],
      ["Subtotal", formatMinor(t.subtotal, plan.currency)],
    ];
    if (t.tax) lines.push([`GST ${Math.round(plan.gst_rate * 100)}%`, formatMinor(t.tax, plan.currency)]);
    lines.push(["Paid via", p.provider === "razorpay" ? "Razorpay" : "Stripe"]);
    await sendInvoiceEmail({ to: email, number: inv.number, planName: plan.name, lines, total: formatMinor(p.amountPaid, plan.currency), url: `${SITE}/portal/invoices/${inv.id}` }).catch((e) =>
      console.error("[billing] invoice email failed", e),
    );
  }
  return "recorded";
}
