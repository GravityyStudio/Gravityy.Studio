import { NextResponse } from "next/server";
import { verifyStripeSignature } from "@/lib/webhook-verify";
import { recordPayment } from "@/lib/payments";

// Stripe → signature-verified webhook → invoice + snapshot (Postgres) → invoice email (Resend).
export async function POST(req: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Stripe webhooks not configured" }, { status: 503 });

  const raw = await req.text(); // raw body: required for the signature
  if (!verifyStripeSignature(raw, req.headers.get("stripe-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    id: string;
    type: string;
    data: { object: { id: string; payment_status?: string; amount_total?: number; currency?: string; metadata?: Record<string, string>; customer_details?: { email?: string } } };
  };

  if (event.type === "checkout.session.completed" && event.data.object.payment_status === "paid") {
    const s = event.data.object;
    const result = await recordPayment({
      provider: "stripe",
      eventId: event.id,
      providerRef: s.id,
      userId: s.metadata?.user_id,
      planId: s.metadata?.plan_id,
      email: s.customer_details?.email,
      amountPaid: s.amount_total ?? 0,
      currency: (s.currency ?? "usd").toUpperCase(),
    });
    return NextResponse.json({ received: true, result });
  }
  return NextResponse.json({ received: true, result: "ignored" });
}
