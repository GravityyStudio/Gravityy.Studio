import { NextResponse } from "next/server";
import { verifyRazorpaySignature } from "@/lib/webhook-verify";
import { recordPayment } from "@/lib/payments";

// Razorpay → signature-verified webhook → invoice + snapshot (Postgres) → invoice email (Resend).
export async function POST(req: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: "Razorpay webhooks not configured" }, { status: 503 });

  const raw = await req.text(); // raw body: required for the signature
  if (!verifyRazorpaySignature(raw, req.headers.get("x-razorpay-signature"), secret)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(raw) as {
    event: string;
    payload: { payment?: { entity: { id: string; order_id?: string; amount: number; currency: string; email?: string; notes?: Record<string, string> } } };
  };
  const payment = event.payload.payment?.entity;

  if (event.event === "payment.captured" && payment) {
    const result = await recordPayment({
      provider: "razorpay",
      // Razorpay sends a unique id per delivery in this header; fall back to the payment id.
      eventId: req.headers.get("x-razorpay-event-id") ?? payment.id,
      providerRef: payment.id,
      userId: payment.notes?.user_id,
      planId: payment.notes?.plan_id,
      email: payment.email,
      amountPaid: payment.amount,
      currency: payment.currency,
    });
    return NextResponse.json({ received: true, result });
  }
  return NextResponse.json({ received: true, result: "ignored" });
}
