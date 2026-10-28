// Configurator math: each service has a set price per scope (Lean / Standard / Advanced, from the studio's price
// list); the estimate is the sum of the chosen services' prices × the timeline factor, kept on a ₹…,999 price point.
// Pure functions (data passed in) so scripts/check-pricing.mts can run them without the bundler.

export const USD_RATE = 83;

export type Option = { id: string; label: string; hint: string; m: number };
export type Plan = { name: string; why: string };

const GROW_IDS = ["auto", "seo", "data"];
const BUILD_IDS = ["web", "ecom", "app", "mobile", "brand", "uiux"];

export type Scope = "lean" | "standard" | "advanced";
export type Prices = Record<Scope, number>;

/** Sum of the services' prices for `scope`, × timeline, on the nearest ₹…,999 point (₹39,999 + ₹19,999 → ₹59,999). */
export function estimateINR(prices: Prices[], scope: Scope, timelineM = 1): number {
  const sum = prices.reduce((a, p) => a + p[scope], 0);
  return sum ? Math.round((sum * timelineM) / 1000) * 1000 - 1 : 0;
}

export function recommend(sel: string[], inr: number): Plan {
  if (!sel.length)
    return { name: "Pick a service to begin", why: "Select one or more services and we’ll suggest the right way to engage." };
  const grow = sel.some((id) => GROW_IDS.includes(id));
  const build = sel.some((id) => BUILD_IDS.includes(id));
  if (build && grow)
    return { name: "Build Websites + Grow", why: "A one-time build followed by a monthly Grow plan to run SEO, automation and analytics." };
  if (grow) return { name: "Grow", why: "Your selection is ongoing work, best run as a monthly retainer." };
  if (inr > 300000) return { name: "Custom system", why: "This scope needs a dedicated squad and a phased plan. We’ll scope it on a call." };
  return { name: "Build Websites", why: "A fixed-price project with a dated plan and 30 days of post-launch support." };
}

export const fmtINR = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");
// Under $1,000 to the dollar ($96), above it to the nearest $10 ($2,530).
export const fmtUSD = (n: number) => "$" + (n < 1000 ? Math.round(n) : Math.round(n / 10) * 10).toLocaleString("en-US");
export const toUSD = (inr: number) => inr / USD_RATE;

export function quoteMessage(o: { services: string[]; scope: string; timeline: string; inr: number; plan: string }) {
  return `Hi Gravityy team,\n\nI'd like a quote for:\n- Services: ${o.services.join(", ")}\n- Scope: ${o.scope}\n- Timeline: ${o.timeline}\n- Configurator estimate: ${fmtINR(o.inr)} (≈ ${fmtUSD(toUSD(o.inr))})\n- Suggested plan: ${o.plan}\n\nAbout the project:\n`;
}
