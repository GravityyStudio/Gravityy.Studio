// Run: node scripts/check-pricing.mts  (Node 22.6+ strips types natively)
import assert from "node:assert/strict";
import { estimateINR, recommend, fmtINR, fmtUSD, toUSD } from "../lib/pricing.ts";

const web = { lean: 14999, standard: 39999, advanced: 89999 };
const seo = { lean: 7999, standard: 19999, advanced: 39999 };
const mobile = { lean: 39999, standard: 149999, advanced: 349999 };

// A single service at the standard timeline is exactly its listed price
assert.equal(estimateINR([web], "standard"), 39999);
assert.equal(estimateINR([web], "lean"), 14999);
assert.equal(estimateINR([web], "advanced"), 89999);
// Combined services land on a ₹…,999 point: 39,999 + 19,999 = 59,998 → 59,999
assert.equal(estimateINR([web, seo], "standard"), 59999);
assert.equal(estimateINR([web, seo, mobile], "standard"), 209999);
// Timeline factors still apply: rush × 1.3, flexible × 0.9
assert.equal(estimateINR([web], "standard", 1.3), 51999);
assert.equal(estimateINR([seo], "lean", 0.9), 6999);
assert.equal(estimateINR([], "standard"), 0);
assert.equal(fmtINR(209999), "₹2,09,999");
assert.equal(fmtUSD(toUSD(7999)), "$84");
assert.equal(fmtUSD(toUSD(209999)), "$2,210");
assert.equal(recommend([], 0).name, "Pick a service to begin");
assert.equal(recommend(["web", "seo"], 59999).name, "Build Websites + Grow");
assert.equal(recommend(["seo"], 19999).name, "Grow");
assert.equal(recommend(["crm", "cloud"], 400000).name, "Custom system");
assert.equal(recommend(["web"], 39999).name, "Build Websites");
console.log("pricing ok");
