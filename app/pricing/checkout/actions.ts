"use server";
import { requireUser } from "@/lib/auth";
import { isPlaceholderPrice, providerFor, type Plan } from "@/lib/billing";
import { createRazorpayOrder, createStripeSession } from "@/lib/payments";

export type CheckoutResult =
  | { kind: "redirect"; url: string }
  | { kind: "razorpay"; keyId: string; orderId: string; amount: number; currency: string; name: string; email: string; planId: string; userId: string }
  | { kind: "error"; message: string };

/**
 * Checkout action (server-side pricing). The client sends only a plan id; price, tax and provider are decided here
 * from the plans table. IN → Razorpay (INR + GST), GLOBAL → Stripe (USD).
 */
export async function startCheckout(planId: string): Promise<CheckoutResult> {
  const { supabase, user, profile } = await requireUser(`/pricing/checkout?plan=${encodeURIComponent(planId)}`);
  const { data: plan } = await supabase.from("plans").select("*").eq("id", planId).eq("active", true).maybeSingle<Plan>();
  if (!plan || isPlaceholderPrice(plan)) return { kind: "error", message: "That plan isn't available any more." };
  const email = profile.email || user.email || "";
  try {
    if (providerFor(plan.region) === "stripe") return { kind: "redirect", url: await createStripeSession(plan, { id: user.id, email }) };
    const order = await createRazorpayOrder(plan, { id: user.id });
    return { kind: "razorpay", ...order, name: plan.name, email, planId: plan.id, userId: user.id };
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : "Checkout failed. Please try again." };
  }
}
