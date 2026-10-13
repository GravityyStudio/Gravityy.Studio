// Configurator math, ported 1:1 from the prototype: sum(base) × scope × timeline, rounded to ₹1,000.
// Pure functions (data passed in) so scripts/check-pricing.mts can run them without the bundler.

export const USD_RATE = 83;

export type Option = { id: string; label: string; hint: string; m: number };
export type Plan = { name: string; why: string };

const GROW_IDS = ["auto", "seo", "data"];
const BUILD_IDS = ["web", "ecom", "app", "mobile", "brand", "uiux"];

export function estimateINR(bases: number[], scopeM: number, timelineM: number): number {
  const base = bases.reduce((a, b) => a + b, 0);
  return Math.round((base * scopeM * timelineM) / 1000) * 1000;
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
export const fmtUSD = (n: number) => "$" + (Math.round(n / 10) * 10).toLocaleString("en-US");
export const toUSD = (inr: number) => inr / USD_RATE;

export function quoteMessage(o: { services: string[]; scope: string; timeline: string; inr: number; plan: string }) {
  return `Hi Gravityy team,\n\nI'd like a quote for:\n- Services: ${o.services.join(", ")}\n- Scope: ${o.scope}\n- Timeline: ${o.timeline}\n- Configurator estimate: ${fmtINR(o.inr)} (≈ ${fmtUSD(toUSD(o.inr))})\n- Suggested plan: ${o.plan}\n\nAbout the project:\n`;
}
