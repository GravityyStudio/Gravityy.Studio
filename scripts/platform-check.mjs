// Platform wiring check against a running server (`npm start`). Works with or without Supabase/payment keys.
// For the webhook signature cases, start the server with STRIPE_WEBHOOK_SECRET=whsec_test RAZORPAY_WEBHOOK_SECRET=rz_secret.
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { chromium } from "playwright";

const URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const ok = (m) => console.log("  ✓", m);

// ---- Edge proxy: auth guard + region ----
for (const path of ["/portal", "/admin", "/admin/cms", "/pricing/checkout?plan=build-in"]) {
  const r = await fetch(URL + path, { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(r.status), `${path} → ${r.status}`);
  const loc = new globalThis.URL(r.headers.get("location"), URL);
  assert.equal(loc.pathname, "/login");
  assert.equal(loc.searchParams.get("next"), path);
}
ok("proxy redirects signed-out visitors from /portal, /admin, /admin/cms, checkout → /login?next=…");

const us = await fetch(URL + "/pricing", { headers: { "x-vercel-ip-country": "US" } });
assert.match(us.headers.get("set-cookie") ?? "", /region=GLOBAL/);
const inr = await fetch(URL + "/pricing", { headers: { "x-vercel-ip-country": "IN" } });
assert.match(inr.headers.get("set-cookie") ?? "", /region=IN/);
ok("proxy sets region cookie from the edge country header (US → GLOBAL, IN → IN)");

// ---- Webhooks: signature verification ----
const post = (p, body, headers) => fetch(URL + p, { method: "POST", body, headers: { "content-type": "application/json", ...headers } });
const stripeBody = JSON.stringify({ id: "evt_test", type: "customer.created", data: { object: { id: "x" } } });
let r = await post("/api/webhooks/stripe", stripeBody, { "stripe-signature": "t=1,v1=bad" });
if (r.status === 503) ok("stripe webhook: 503 when STRIPE_WEBHOOK_SECRET is unset");
else {
  assert.equal(r.status, 400);
  const t = Math.floor(Date.now() / 1000);
  const sig = createHmac("sha256", "whsec_test").update(`${t}.${stripeBody}`).digest("hex");
  r = await post("/api/webhooks/stripe", stripeBody, { "stripe-signature": `t=${t},v1=${sig}` });
  assert.equal(r.status, 200);
  assert.equal((await r.json()).result, "ignored");
  ok("stripe webhook: forged signature → 400, valid signature → 200 (non-payment event ignored)");
}
const rzBody = JSON.stringify({ event: "order.notification", payload: {} });
r = await post("/api/webhooks/razorpay", rzBody, { "x-razorpay-signature": "bad" });
if (r.status === 503) ok("razorpay webhook: 503 when RAZORPAY_WEBHOOK_SECRET is unset");
else {
  assert.equal(r.status, 400);
  r = await post("/api/webhooks/razorpay", rzBody, { "x-razorpay-signature": createHmac("sha256", "rz_secret").update(rzBody).digest("hex") });
  assert.equal(r.status, 200);
  ok("razorpay webhook: forged signature → 400, valid signature → 200");
}

// ---- UI: login, pricing → checkout links, region tab ----
const browser = await chromium.launch();
for (const w of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL + "/login?next=/portal", { waitUntil: "networkidle" });
  assert.equal(await page.locator("h1").count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
  await page.screenshot({ path: `shots/login-${w}.png` });

  await page.goto(URL + "/pricing", { waitUntil: "networkidle" });
  const buy = page.locator('#pricing-panel a[href^="/pricing/checkout?plan="]');
  assert.equal(await buy.count(), 2);
  assert.equal(await buy.first().getAttribute("href"), "/pricing/checkout?plan=build-in");
  assert.match(await page.locator("#pricing-panel").innerText(), /18% GST/);
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  await page.screenshot({ path: `shots/pricing-buy-${w}.png` });
  assert.deepEqual(errors, []);
  await page.close();
}
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
await ctx.addCookies([{ name: "region", value: "GLOBAL", url: URL }]);
const p = await ctx.newPage();
await p.goto(URL + "/pricing", { waitUntil: "networkidle" });
await p.waitForTimeout(500);
assert.equal(await p.getByRole("tab", { name: "International" }).getAttribute("aria-selected"), "true");
assert.equal(await p.locator('#pricing-panel a[href^="/pricing/checkout"]').first().getAttribute("href"), "/pricing/checkout?plan=build-global");
ok("pricing: Buy buttons → checkout with plan ids; GST note on India; GLOBAL region opens International tab");
await browser.close();
console.log("platform ok");
