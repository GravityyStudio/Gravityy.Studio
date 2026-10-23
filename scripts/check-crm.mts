// CRM intake unit checks (no database needed). Run: npx tsx scripts/check-crm.mts
// Database behaviour is covered by supabase/tests/crm_intake.sql and crm_rls.sql.
import assert from "node:assert/strict";
import { scoreLead, MQL_THRESHOLD } from "../lib/crm/scoring.ts";
import { businessDomain, intakeSchema, normaliseWebsite } from "../lib/crm/intake.ts";

// ---- normalisation ----
assert.equal(normaliseWebsite("acme.com/pricing"), "https://acme.com");
assert.equal(normaliseWebsite("https://WWW.Acme.co.in/"), "https://acme.co.in");
assert.equal(normaliseWebsite("http://shop.acme.com"), "https://shop.acme.com");
assert.equal(normaliseWebsite("not a url"), null);
assert.equal(normaliseWebsite(""), null);
assert.equal(normaliseWebsite(undefined), null);

assert.equal(businessDomain("asha@acme.com"), "acme.com");
assert.equal(businessDomain("Asha@ACME.com".toLowerCase()), "acme.com");
assert.equal(businessDomain("ravi@gmail.com"), null, "free mail is not a company");
assert.equal(businessDomain("ravi@yahoo.co.in"), null);

const parsed = intakeSchema.parse({ source: "contact", email: "  Asha@Acme.COM ", name: " Asha ", message: " hi " });
assert.deepEqual(parsed, { source: "contact", email: "asha@acme.com", name: "Asha", message: "hi" });
assert.throws(() => intakeSchema.parse({ source: "scrape", email: "a@b.co" }), "unknown sources are rejected");
assert.throws(() => intakeSchema.parse({ source: "contact", email: "nope" }), "bad email is rejected");

// ---- scoring (rules-v1) ----
const strong = scoreLead({
  source: "contact",
  name: "Asha Rao",
  businessDomain: "acme.com",
  website: null,
  message: "We need a new Shopify e-commerce website for our skincare brand, launching in 6 weeks. Budget is around 5 lakh. Can you share a plan and timeline?",
});
const points = Object.fromEntries(strong.factors.map((f) => [f.factor, f.points]));
assert.equal(points["Business email domain"], 20);
assert.equal(points["Sent a project enquiry"], 10);
assert.equal(points["Mentions a budget"], 15);
assert.equal(points["Mentions a timeline"], 10);
assert.equal(points["Names a service we offer"], 10);
assert.equal(points["Detailed brief (120+ characters)"], 10);
assert.equal(points["Gave a full name"], 5);
assert.equal(strong.score, 80);
assert.equal(strong.qualification, "mql");

const weak = scoreLead({ source: "contact", name: "R", businessDomain: null, website: null, message: "hello" });
assert.deepEqual(weak, { score: 10, qualification: "unqualified", factors: [{ factor: "Sent a project enquiry", points: 10 }] });

const audit = scoreLead({ source: "audit", name: "", businessDomain: "acme.com", website: "https://acme.com", message: "Free audit requested for acme.com" });
assert.equal(audit.score, 45, "business email + audit + website");
assert.equal(audit.qualification, "unqualified");
assert.ok(audit.score < MQL_THRESHOLD);

// Scores never exceed 100 and every point has a reason.
const max = scoreLead({ source: "audit", name: "A B", businessDomain: "x.com", website: "https://x.com", message: "website budget ₹5 lakh asap ".repeat(10) });
assert.ok(max.score <= 100);
assert.equal(max.factors.reduce((s, f) => s + f.points, 0) >= max.score, true);

// ---- form handler paths that need no database ----
process.env.SUPABASE_SERVICE_ROLE_KEY = ""; // force the no-database path: limiter fails open, intake logs and continues
const { handleForm } = await import("../lib/api.ts");
const { contactSchema } = await import("../lib/schemas.ts");
const post = (body: unknown) => new Request("http://localhost/api/contact", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
const quiet = console.error; const warn = console.warn; const log = console.log;
console.error = console.warn = console.log = () => {};
try {
  const bad = await handleForm(post({ name: "", email: "x", message: "" }), contactSchema, "s", "ok");
  assert.equal(bad.status, 422, "invalid input → 422");
  const trap = await handleForm(post({ name: "Bot", email: "bot@example.com", message: "Buy now buy now", website: "spam.example" }), contactSchema, "s", "Thanks");
  assert.deepEqual(await trap.json(), { ok: true, message: "Thanks" }, "honeypot → silent success");
  const real = await handleForm(post({ name: "Asha", email: "asha@acme.com", message: "We need a website soon." }), contactSchema, "s", "Thanks", (f) => ({ source: "contact", ...f }));
  assert.equal(real.status, 200, "database down → enquiry still accepted (emailed), error logged");
  const notJson = await handleForm(new Request("http://localhost/api/contact", { method: "POST", body: "{" }), contactSchema, "s", "ok");
  assert.equal(notJson.status, 400);
} finally {
  console.error = quiet; console.warn = warn; console.log = log;
}

console.log("crm ok");
