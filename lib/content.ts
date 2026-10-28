import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import site from "@/data/site.json";
import services from "@/data/services.json";
import configurator from "@/data/configurator.json";
import solutions from "@/data/solutions.json";
import cases from "@/data/cases.json";
import steps from "@/data/process.json"; // not `process`: would shadow the Node global
import stack from "@/data/stack.json";
import funnel from "@/data/funnel.json";
import testimonials from "@/data/testimonials.json";
import pricing from "@/data/pricing.json";
import faq from "@/data/faq.json";
import charts from "@/data/charts.json";
import plans from "@/data/plans.json";
import pages from "@/data/pages.json";
import theme from "@/data/theme.json";
import typography from "@/data/typography.json";
import addons from "@/data/addons.json";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "./supabase/env";
import type { Addon, Plan } from "./billing";
import { pageMeta } from "./seo";
import { USD_RATE } from "./pricing";

/** Local data/*.json = the shape of every CMS entry and the fallback when Supabase isn't configured or is down. */
export const LOCAL = {
  site, services, configurator, solutions, cases, process: steps, stack, funnel, testimonials, pricing, faq, charts, pages, theme, typography,
  plans: plans as Plan[],
  addons: addons as Addon[],
  usdRate: USD_RATE,
};
export type Content = typeof LOCAL;
export const CMS_KEYS = ["site", "services", "configurator", "solutions", "cases", "process", "stack", "funnel", "testimonials", "pricing", "faq", "charts", "pages", "theme", "typography"] as const;
export type CmsKey = (typeof CMS_KEYS)[number];

export const CMS_TAG = "cms";
export const REVALIDATE_S = 300;

/** Anon client for public reads (no cookies → cacheable), ISR-tagged `cms` so admin saves revalidate it. */
export const publicClient = () =>
  createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { fetch: (url, init) => fetch(url, { ...init, next: { revalidate: REVALIDATE_S, tags: [CMS_TAG] } }) },
  });

/**
 * Marketing content for ISR. One `cms_published_all` RPC (anon key, no cookies → cacheable), tagged `cms` so
 * admin edits revalidate instantly via revalidateTag; otherwise refreshed every 5 minutes.
 * Missing/unpublished keys fall back to the local JSON so a half-filled CMS never breaks a page.
 */
/** Today's USD → INR (European Central Bank reference rate via Frankfurter: free, no key), cached for a day. */
async function usdRate(): Promise<number> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?from=USD&to=INR", { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000) });
    const r = Number((await res.json())?.rates?.INR);
    if (r > 50 && r < 200) return r; // sanity bounds: a bad response never reaches the prices
  } catch (e) {
    console.error("[fx] using the fallback rate:", e);
  }
  return USD_RATE;
}

export const getContent = cache(async (): Promise<Content> => {
  const [content, rate] = await Promise.all([cmsContent(), usdRate()]);
  return { ...content, usdRate: rate };
});

async function cmsContent(): Promise<Content> {
  if (!supabaseConfigured) return LOCAL;
  try {
    const { data, error } = await publicClient().rpc("cms_published_all");
    if (error) throw error;
    const entries = (data?.entries ?? {}) as Partial<Content>;
    const merged = { ...LOCAL } as Content;
    for (const k of CMS_KEYS) if (entries[k] != null) (merged as Record<string, unknown>)[k] = entries[k];
    const livePlans = data?.plans as Plan[] | undefined;
    if (livePlans?.length) merged.plans = livePlans;
    if (Array.isArray(data?.addons)) merged.addons = data.addons as Addon[];
    return merged;
  } catch (e) {
    console.error("[cms] falling back to local content:", e);
    return LOCAL;
  }
}

type PageCopy = { title: string; metaDescription: string };

/** generateMetadata for a marketing page: title + description from the `pages` CMS entry. */
export async function cmsPageMeta(key: keyof Content["pages"], path: string) {
  const p = (await getContent()).pages[key] as PageCopy;
  return pageMeta(path, p.title, p.metaDescription);
}
