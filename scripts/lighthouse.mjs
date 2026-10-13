// Mobile Lighthouse against a running production server. Usage: npm start, then `node scripts/lighthouse.mjs [url]`.
// Needs Chrome installed; set CHROME_PATH if it isn't found automatically.
import { execSync } from "node:child_process";
import { readFileSync, mkdirSync } from "node:fs";

const url = process.argv[2] ?? "http://localhost:3000";
mkdirSync("lighthouse", { recursive: true });
execSync(`npx -y lighthouse@12 ${url} --output=json --output=html --output-path=lighthouse/mobile --chrome-flags="--headless=new" --quiet`, { stdio: "inherit" });
const r = JSON.parse(readFileSync("lighthouse/mobile.report.json", "utf8"));
for (const [k, v] of Object.entries(r.categories)) console.log(k.padEnd(16), Math.round(v.score * 100));
for (const a of ["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"]) console.log(a.padEnd(26), r.audits[a].displayValue);
console.log("LCP element:", r.audits["largest-contentful-paint-element"]?.details?.items?.[0]?.items?.[0]?.node?.snippet);
for (const a of Object.values(r.audits))
  if (a.score !== null && a.score < 0.9 && !["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode)) console.log("  below 0.9:", a.id, a.displayValue ?? "");
