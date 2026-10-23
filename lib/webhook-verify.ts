import { createHmac, timingSafeEqual } from "node:crypto";

const safeEqual = (a: string, b: string) => {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
};

/**
 * Stripe: header `Stripe-Signature: t=<unix>,v1=<hex>[,v1=…]`, v1 = HMAC-SHA256(secret, `${t}.${rawBody}`).
 * Rejects stale timestamps (replay protection, default 5 min).
 */
export function verifyStripeSignature(raw: string, header: string | null, secret: string, toleranceS = 300, now = Date.now()) {
  if (!header) return false;
  const parts = header.split(",").map((p) => p.split("=") as [string, string]);
  const t = parts.find(([k]) => k === "t")?.[1];
  const sigs = parts.filter(([k]) => k === "v1").map(([, v]) => v);
  if (!t || !sigs.length) return false;
  if (Math.abs(now / 1000 - Number(t)) > toleranceS) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex");
  return sigs.some((s) => safeEqual(s, expected));
}

/** Signs our own webhooks (app ⇄ n8n) in the same `t=…,v1=…` format, so verifyStripeSignature checks them. */
export function signPayload(raw: string, secret: string, now = Date.now()) {
  const t = Math.floor(now / 1000);
  return `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${raw}`).digest("hex")}`;
}

/** Razorpay webhooks: header `X-Razorpay-Signature` = hex HMAC-SHA256(webhookSecret, rawBody). */
export function verifyRazorpaySignature(raw: string, header: string | null, secret: string) {
  if (!header) return false;
  return safeEqual(header, createHmac("sha256", secret).update(raw).digest("hex"));
}
