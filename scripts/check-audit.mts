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
console.log("audit checks ok");
