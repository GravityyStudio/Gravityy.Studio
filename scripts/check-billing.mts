// Run: node scripts/check-billing.mts   (pure logic: no network, no database)
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { verifyRazorpaySignature, verifyStripeSignature } from "../lib/webhook-verify.ts";
import { formatMinor, planTotals, providerFor, regionFromCountry } from "../lib/billing.ts";
import { safeNext } from "../lib/safe-next.ts";

// ---- Stripe signature: valid, tampered, wrong secret, stale (replay) ----
const secret = "whsec_test";
const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
const now = Date.UTC(2026, 9, 13, 12, 0, 0);
const t = Math.floor(now / 1000);
const sig = createHmac("sha256", secret).update(`${t}.${body}`).digest("hex");
assert.equal(verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, 300, now), true);
assert.equal(verifyStripeSignature(body + " ", `t=${t},v1=${sig}`, secret, 300, now), false, "tampered body");
assert.equal(verifyStripeSignature(body, `t=${t},v1=${sig}`, "whsec_other", 300, now), false, "wrong secret");
assert.equal(verifyStripeSignature(body, `t=${t},v1=${sig}`, secret, 300, now + 301_000), false, "replay outside tolerance");
assert.equal(verifyStripeSignature(body, `t=${t},v1=deadbeef,v1=${sig}`, secret, 300, now), true, "multiple v1 (secret rotation)");
assert.equal(verifyStripeSignature(body, null, secret), false);

// ---- Razorpay signature ----
const rz = createHmac("sha256", "rz_secret").update(body).digest("hex");
assert.equal(verifyRazorpaySignature(body, rz, "rz_secret"), true);
assert.equal(verifyRazorpaySignature(body, rz.replace(/.$/, "0"), "rz_secret"), rz.endsWith("0"));
assert.equal(verifyRazorpaySignature(body, "short", "rz_secret"), false);

// ---- Server-side pricing ----
assert.deepEqual(planTotals({ amount_minor: 5999900, gst_rate: 0.18 }), { subtotal: 5999900, tax: 1079982, total: 7079882 }); // ₹59,999 + 18% GST
assert.deepEqual(planTotals({ amount_minor: 149000, gst_rate: 0 }), { subtotal: 149000, tax: 0, total: 149000 });
assert.equal(formatMinor(7079882, "INR"), "₹70,798.82");
assert.equal(formatMinor(149000, "USD"), "$1,490");

// ---- Region routing (diagram: IN → Razorpay, GLOBAL → Stripe) ----
assert.equal(regionFromCountry("IN"), "IN");
assert.equal(regionFromCountry("us"), "GLOBAL");
assert.equal(regionFromCountry(null), "IN"); // localhost / unknown
assert.equal(providerFor("IN"), "razorpay");
assert.equal(providerFor("GLOBAL"), "stripe");

// ---- Open-redirect guard ----
assert.equal(safeNext("/portal/invoices/1"), "/portal/invoices/1");
assert.equal(safeNext("//evil.com"), "/portal");
assert.equal(safeNext("https://evil.com"), "/portal");
assert.equal(safeNext("/\\evil.com"), "/portal");
assert.equal(safeNext(undefined), "/portal");

console.log("billing ok");
