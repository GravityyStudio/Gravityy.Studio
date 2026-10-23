// Discovery unit tests (no network, no database). Run: npx tsx scripts/check-discovery.mts
// Network behaviour: scripts/check-discovery-integration.mts. Database rules: supabase/tests/discovery.sql.
import assert from "node:assert/strict";
import { assertSafeUrl, isAllowedByRobots, isPublicIp, parseRobots } from "../lib/discovery/fetcher.ts";
import { analyzeHtml } from "../lib/discovery/analyze.ts";
import { DEFAULT_SCORING, resolveConfig, scoreProspect, scoringConfigSchema } from "../lib/discovery/scoring.ts";
import { parseCsv, readProspectsCsv } from "../lib/discovery/csv.ts";
import { crmFieldsFor, expiresAt, googlePlaces, policyFor } from "../lib/discovery/providers.ts";
import { buildEvent, crmUpdated } from "../lib/events/contracts.ts";

const ids = (fs: { id: string }[]) => fs.map((f) => f.id);
const quiet = <T,>(fn: () => T) => { const e = console.error; console.error = () => {}; try { return fn(); } finally { console.error = e; } };

// ---------- SSRF guard ----------
for (const ip of ["10.0.0.1", "127.0.0.1", "169.254.169.254", "192.168.1.1", "172.16.5.4", "100.64.0.1", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
  assert.equal(isPublicIp(ip), false, `${ip} must be blocked`);
for (const ip of ["8.8.8.8", "172.32.0.1", "1.1.1.1", "2606:4700:4700::1111"]) assert.equal(isPublicIp(ip), true, `${ip} is public`);
await assert.rejects(assertSafeUrl("ftp://example.com"), /http and https/);
await assert.rejects(assertSafeUrl("https://user:pw@example.com"), /credentials/);
await assert.rejects(assertSafeUrl("https://example.com:8443/"), /ports/);
await assert.rejects(assertSafeUrl("http://127.0.0.1/"), /public internet/);
await assert.rejects(assertSafeUrl("http://localhost/"), /public internet/);
await assert.rejects(assertSafeUrl("http://[::1]/"), /public internet/);

// ---------- robots.txt ----------
const robots = parseRobots("User-agent: *\nDisallow: /private\nAllow: /private/ok\nDisallow: /*.pdf$\n\nUser-agent: g\nDisallow: /\n");
assert.equal(isAllowedByRobots(robots, "/"), true);
assert.equal(isAllowedByRobots(robots, "/private/x"), false);
assert.equal(isAllowedByRobots(robots, "/private/ok/1"), true, "longer Allow beats shorter Disallow");
assert.equal(isAllowedByRobots(robots, "/files/a.pdf"), false, "wildcard + $ anchor");
assert.equal(isAllowedByRobots(robots, "/files/a.pdf?x=1"), true);
const ours = parseRobots("User-agent: *\nDisallow: /\n\nUser-agent: GravityyStudioBot\nDisallow: /admin\n");
assert.equal(isAllowedByRobots(ours, "/"), true, "our own group replaces the * group");
assert.equal(isAllowedByRobots(ours, "/admin"), false);
assert.equal(isAllowedByRobots(parseRobots("User-agent: *\nDisallow:\n"), "/anything"), true, "empty Disallow allows all");

// ---------- HTML analysis ----------
const bad = `<html><head></head><body><div><img src="a.png"><img src="b.png" alt=""><a href="/about">About us</a><p>${"Welcome to our clinic. ".repeat(30)}</p></div></body></html>`;
const b = analyzeHtml(bad, "http://bad.example/");
for (const id of ["title-missing", "description-missing", "viewport-missing", "no-https", "lang-missing", "h1-missing", "img-alt-missing", "cta-missing", "nav-missing", "og-missing", "canonical-missing"])
  assert.ok(ids(b.findings).includes(id), `bad page should report ${id}`);
const certainty = Object.fromEntries(b.findings.map((f) => [f.id, f.certainty]));
assert.equal(certainty["title-missing"], "confirmed");
assert.equal(certainty["viewport-missing"], "confirmed");
assert.equal(certainty["h1-missing"], "confirmed", "server-rendered page: missing h1 is confirmed");
assert.equal(certainty["cta-missing"], "inferred", "CTA could be an image or JS: inferred");
assert.equal(certainty["nav-missing"], "inferred");
assert.match(b.findings.find((f) => f.id === "img-alt-missing")!.evidence, /1 of 2/, "alt=\"\" is a valid decorative image");
assert.deepEqual(b.signals.internalLinks, ["http://bad.example/about"]);

const good = `<!doctype html><html lang="en"><head><title>Acme Dental, Pune</title><meta name="description" content="Family dental care">
<meta name="viewport" content="width=device-width, initial-scale=1"><meta property="og:title" content="Acme"><meta property="og:image" content="/og.png">
<link rel="canonical" href="https://acme.example/"></head><body><header><nav><a href="/">Home</a><a href="/services">Services</a></nav></header>
<h1>Gentle dentistry</h1><img src="x.jpg" alt="Clinic"><a href="/contact">Book an appointment</a><p>${"Text. ".repeat(80)}</p></body></html>`;
const g = analyzeHtml(good, "https://acme.example/");
assert.deepEqual(g.findings, [], `good page has no findings: ${ids(g.findings).join(", ")}`);
assert.equal(g.signals.ctaCount, 1);
assert.equal(g.signals.title, "Acme Dental, Pune");

const zoom = analyzeHtml(good.replace("initial-scale=1", "initial-scale=1, user-scalable=no"), "https://acme.example/");
assert.deepEqual(ids(zoom.findings), ["zoom-disabled"]);

const spa = `<html lang="en"><head><title>App</title><script src="a.js"></script><script src="b.js"></script><script src="c.js"></script></head><body><div id="root"></div></body></html>`;
const s = analyzeHtml(spa, "https://spa.example/");
assert.equal(s.signals.jsRendered, true);
assert.equal(s.findings.find((f) => f.id === "h1-missing")?.certainty, "inferred", "JS-rendered page: content checks are inferred");
assert.ok(ids(s.findings).includes("js-rendered"));
assert.equal(analyzeHtml(`<html><body><a href="/cart">Cart</a> add to cart</body></html>`, "https://shop.example/").signals.ecommerce, true);

// ---------- scoring ----------
assert.equal(scoringConfigSchema.safeParse(DEFAULT_SCORING).success, true);
assert.equal(scoringConfigSchema.safeParse({ ...DEFAULT_SCORING, weights: { industryFit: 50, websiteNeeds: 50, projectBudget: 20, purchaseIntent: 0 } }).success, false, "weights must sum to 100");
assert.deepEqual(quiet(() => resolveConfig({ weights: "nonsense" })), DEFAULT_SCORING, "bad stored settings fall back to defaults");
assert.equal(resolveConfig({ qualifyThreshold: 70 }).qualifyThreshold, 70, "stored settings merge over defaults");

const blank = { industry: null, category: null, size_band: null, intent_signals: [], website: null };
const none = scoreProspect(blank, null);
assert.equal(none.total, 35, "no website = full website-needs points (35), everything else unknown");
assert.equal(none.confidence, "low");
assert.equal(none.components.find((c) => c.key === "industryFit")!.known, false);

const unanalysed = scoreProspect({ ...blank, website: "https://acme.example" }, null);
assert.equal(unanalysed.total, 0);
assert.equal(unanalysed.components.find((c) => c.key === "websiteNeeds")!.reasons[0], "Website not analysed yet.");

const analysed = { status: "ok", findings: b.findings, signals: { ...b.signals, ecommerce: true } };
const full = scoreProspect({ industry: "Dental clinic", category: null, size_band: "11-50", intent_signals: ["requested_quote", "unknown_signal"], website: "http://bad.example" }, analysed);
const pts = Object.fromEntries(full.components.map((c) => [c.key, c.points]));
assert.equal(pts.industryFit, 25, "target industry");
assert.equal(pts.websiteNeeds, 35, "many issues: capped at the weight");
assert.equal(pts.projectBudget, 18, "11-50 (65%) + online store (25%) = 90% of 20");
assert.equal(pts.purchaseIntent, 20, "requested_quote = 100%; unknown signals ignored");
assert.equal(full.total, 98);
assert.equal(full.qualified, true);
assert.equal(full.confidence, "high");
assert.equal(scoreProspect({ ...blank, industry: "Law firm (legal)" }, null).components[0].points, 12.5, "adjacent industry = half");
assert.equal(scoreProspect({ ...blank, website: "https://x.example" }, { status: "blocked", findings: [], signals: null }).components[1].known, false, "blocked site: website needs unknown, not zero-need");
const inferredOnly = scoreProspect({ ...blank, website: "https://x.example" }, { status: "ok", findings: [{ id: "cta-missing", category: "conversion", severity: "high", certainty: "inferred", title: "No CTA", evidence: "" }], signals: null });
assert.equal(inferredOnly.components[1].points, 5, "inferred high finding = 10 × 0.5");

// ---------- CSV ----------
assert.deepEqual(parseCsv('name,notes\r\n"Acme, Inc","said ""hi""\nthere"\n'), [["name", "notes"], ["Acme, Inc", 'said "hi"\nthere']]);
assert.throws(() => parseCsv('name\n"unclosed'), /Unclosed quote/);
assert.throws(() => readProspectsCsv("name,email\nAcme,a@acme.com"), /personal contact columns \(email\)/);
assert.throws(() => readProspectsCsv("Company Name,Phone Number\nAcme,123"), /personal contact columns/);
assert.throws(() => readProspectsCsv("website,city\nacme.com,Pune"), /company name column/);
assert.throws(() => readProspectsCsv(`name\n${"x\n".repeat(1001)}`), /limit is 1000/);
const csv = readProspectsCsv("Company,Website,Industry,Country,Size,Intent,Favourite colour\nAcme,https://www.Acme.com/x,Dental,in,11-50,requested_quote;referral,blue\nAcme again,acme.com,Dental,IN,,,\nBad Co,not a site,,,,,\n,missing name,,,,,\nBeta,beta.io,,USA,,,\n");
assert.equal(csv.rows.length, 1);
assert.deepEqual(csv.rows[0], { name: "Acme", website: "https://acme.com", domain: "acme.com", industry: "Dental", category: null, city: null, region: null, country: "IN", size_band: "11-50", intent_signals: ["requested_quote", "referral"], notes: null });
assert.equal(csv.duplicatesInFile, 1, "same domain twice in one file");
assert.deepEqual(csv.errors.map((e) => e.row), [4, 5, 6], "row numbers count the header line");
assert.match(csv.errors[0].message, /valid website/);
assert.match(csv.errors[2].message, /2-letter country/);
assert.deepEqual(csv.ignoredColumns, ["Favourite colour"]);

// ---------- providers + retention ----------
assert.equal(policyFor("manual", "manual").retentionDays, null);
assert.equal(policyFor("api", "google_places").retentionDays, 30);
assert.equal(policyFor("api", "some_new_provider").retentionDays, 30, "unknown provider: strictest default");
const placesProspect = { source: "api", provider: "google_places", name: "Acme", domain: "acme.com", website: "https://acme.com", industry: "Dentist", country: "IN", size_band: null };
assert.deepEqual(crmFieldsFor(placesProspect, true), { company: { name: null, domain: "acme.com", website: "https://acme.com", industry: null, country: null, size_band: null }, qualification: "mql" });
assert.equal(crmFieldsFor({ ...placesProspect, source: "manual", provider: "manual" }, false).company.name, "Acme");
assert.equal(expiresAt(policyFor("api", "google_places"), new Date("2026-01-01T00:00:00Z")), "2026-01-31T00:00:00.000Z");
assert.equal(expiresAt(policyFor("manual", "manual")), null);

delete process.env.GOOGLE_PLACES_API_KEY;
assert.equal(googlePlaces.enabled(), false, "off without a key");
await assert.rejects(googlePlaces.search({ category: "dentist", location: "Pune", max: 5 }), /not configured/);
process.env.GOOGLE_PLACES_API_KEY = "test-key";
const realFetch = globalThis.fetch;
const calls: { headers: Record<string, string>; body: { pageToken?: string } }[] = [];
globalThis.fetch = (async (_url: string, init: RequestInit) => {
  calls.push({ headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body)) });
  const page = calls.length === 1
    ? { places: [{ id: "p1", displayName: { text: "Acme Dental" }, websiteUri: "https://www.acme-dental.in/home", primaryTypeDisplayName: { text: "Dentist" }, addressComponents: [{ longText: "Pune", types: ["locality"] }, { longText: "Maharashtra", types: ["administrative_area_level_1"] }, { shortText: "in", types: ["country"] }] }, { id: "p2" }], nextPageToken: "next" }
    : { places: [{ id: "p3", displayName: { text: "Beta Clinic" }, types: ["dental_clinic"] }] };
  return new Response(JSON.stringify(page), { status: 200 });
}) as typeof fetch;
try {
  const found = await googlePlaces.search({ category: "dentist", location: "Pune", max: 5 });
  assert.deepEqual(found, [
    { name: "Acme Dental", website: "https://acme-dental.in", domain: "acme-dental.in", category: "Dentist", city: "Pune", region: "Maharashtra", country: "IN", provider_ref: "p1" },
    { name: "Beta Clinic", website: null, domain: null, category: "dental clinic", city: null, region: null, country: null, provider_ref: "p3" },
  ], "maps fields, skips nameless places, follows the next page");
  assert.equal(calls[0].headers["x-goog-api-key"], "test-key");
  assert.equal(calls[1].body.pageToken, "next");
  globalThis.fetch = (async () => new Response(JSON.stringify({ error: { message: "API key not valid" } }), { status: 403 })) as typeof fetch;
  await assert.rejects(googlePlaces.search({ category: "x", location: "y", max: 1 }), /API key not valid/);
} finally {
  globalThis.fetch = realFetch;
  delete process.env.GOOGLE_PLACES_API_KEY;
}

// ---------- event contracts ----------
const ws = "00000000-0000-4000-8000-000000000001";
const ev = buildEvent("lead.scored", ws, { prospect_id: ws, score: 98, qualified: true, confidence: "high", model: full.model, components: full.components.map(({ key, points, max, known }) => ({ key, points, max, known })) });
assert.equal(ev.type, "lead.scored");
assert.equal(ev.version, 1);
assert.throws(() => buildEvent("lead.scored", ws, { prospect_id: ws, score: 120 } as never), "bad data breaks the contract");
assert.throws(() => buildEvent("website.analyzed", ws, { prospect_id: ws, analysis_id: ws, status: "ok", confirmed_count: 1, inferred_count: 0, high_severity_count: 0, email: "x@y.z" } as never), "unknown fields (e.g. personal data) are rejected");
// Shape produced inside Postgres by prospect_add_to_crm() (to_jsonb(now()) format).
assert.equal(crmUpdated.safeParse({ id: ws, type: "crm.updated", version: 1, occurred_at: "2026-10-23T07:25:54.459123+00:00", workspace_id: ws, data: { action: "prospect_added", prospect_id: ws, company_id: ws, lead_id: ws } }).success, true);

console.log("discovery ok");
