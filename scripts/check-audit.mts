// Run: node scripts/check-audit.mts  (Node 22.6+ strips types natively). PageSpeed summary parser, offline.
import assert from "node:assert/strict";
import { summarize } from "../lib/audit/pagespeed.ts";

const lhr = {
  categories: { performance: { score: 0.874 }, accessibility: { score: 1 }, "best-practices": { score: null }, seo: { score: 0.92 } },
  audits: {
    "largest-contentful-paint": { displayValue: "2.7 s" },
    "cumulative-layout-shift": { displayValue: "0" },
    "total-blocking-time": { displayValue: "60 ms" },
    "first-contentful-paint": { displayValue: "1.7 s" },
    "unused-javascript": { title: "Reduce unused JavaScript", displayValue: "Est savings of 36 KiB", details: { type: "opportunity", overallSavingsMs: 450 } },
    "render-blocking": { title: "Eliminate render-blocking resources", details: { type: "opportunity", overallSavingsMs: 1200 } },
    "no-gain": { title: "Already fine", details: { type: "opportunity", overallSavingsMs: 0 } },
    "not-an-opportunity": { title: "Diagnostic", details: { type: "table" } },
  },
};
// Lighthouse 13 (current PSI): insights carry metricSavings instead of details.type "opportunity"
const lh13 = {
  audits: {
    "render-blocking-insight": { title: "Render blocking requests", displayValue: "Est savings of 450 ms", score: 0, metricSavings: { FCP: 450, LCP: 450 }, details: { type: "table" } },
    "image-delivery-insight": { title: "Improve image delivery", displayValue: "Est savings of 42 KiB", score: 0.5, metricSavings: { LCP: 150 }, details: { type: "table" } },
    "passing-insight": { title: "Already passing", score: 1, metricSavings: { LCP: 0 }, details: { type: "table" } },
    "passed-but-savings": { title: "Passed with a tiny saving", score: 0.95, metricSavings: { LCP: 20 }, details: { type: "table" } },
  },
};

const s = summarize(lhr);
assert.deepEqual(s.scores, { performance: 87, accessibility: 100, bestPractices: null, seo: 92 });
assert.equal(s.vitals.lcp, "2.7 s");
assert.equal(s.vitals.speedIndex, null); // missing audit → null, not a crash
// Only real opportunities with savings, biggest first; missing displayValue falls back to the saving in seconds
assert.deepEqual(s.opportunities, [
  { title: "Eliminate render-blocking resources", savings: "1.2 s" },
  { title: "Reduce unused JavaScript", savings: "Est savings of 36 KiB" },
]);
assert.deepEqual(summarize({}).opportunities, []); // empty report doesn't throw
assert.deepEqual(summarize(lh13).opportunities, [
  { title: "Render blocking requests", savings: "Est savings of 450 ms" },
  { title: "Improve image delivery", savings: "Est savings of 42 KiB" },
]);
console.log("audit checks ok");
