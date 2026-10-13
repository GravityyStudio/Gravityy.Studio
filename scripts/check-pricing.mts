// Run: node scripts/check-pricing.mts  (Node 22.6+ strips types natively)
import assert from "node:assert/strict";
import { estimateINR, recommend, fmtINR, fmtUSD, toUSD } from "../lib/pricing.ts";

// Default prototype state: web (60k) + seo (30k), standard × standard
assert.equal(estimateINR([60000, 30000], 1, 1), 90000);
assert.equal(fmtINR(90000), "₹90,000");
assert.equal(fmtUSD(toUSD(90000)), "$1,080");
// Advanced + rush: app 150k → 150000 × 1.5 × 1.3 = 292,500 → rounds to 293,000 (not 292,000)
assert.equal(estimateINR([150000], 1.5, 1.3), 293000);
// Lean + flexible rounding
assert.equal(estimateINR([35000], 0.75, 0.9), 24000);
assert.equal(recommend([], 0).name, "Pick a service to begin");
assert.equal(recommend(["web", "seo"], 90000).name, "Build Websites + Grow");
assert.equal(recommend(["seo"], 30000).name, "Grow");
assert.equal(recommend(["crm", "cloud"], 400000).name, "Custom system");
assert.equal(recommend(["web"], 60000).name, "Build Websites");
console.log("pricing ok");
