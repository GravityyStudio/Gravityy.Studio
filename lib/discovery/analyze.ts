import { fetchPage, robotsAllows, safeRequest, type FetchOptions } from "./fetcher";

// Visible-website findings from public HTML. Each finding says whether it is CONFIRMED (directly observed in the
// returned markup or an HTTP status) or INFERRED (a likely issue that markup alone can't prove, e.g. content that
// may be rendered by JavaScript). No JavaScript runs, so JS-heavy pages get their content findings downgraded.

export type Severity = "high" | "medium" | "low";
export type Certainty = "confirmed" | "inferred";
export type Finding = {
  id: string;
  category: "metadata" | "mobile" | "navigation" | "conversion" | "security" | "accessibility" | "performance";
  severity: Severity;
  certainty: Certainty;
  title: string;
  evidence: string;
};
export type Signals = { title: string | null; ecommerce: boolean; contactForm: boolean; jsRendered: boolean; ctaCount: number; internalLinks: string[] };
export type AnalysisStatus = "ok" | "blocked" | "robots_disallowed" | "not_html" | "error";
export type Analysis = {
  status: AnalysisStatus;
  url: string;
  finalUrl: string | null;
  httpStatus: number | null;
  durationMs: number;
  bytes: number;
  findings: Finding[];
  signals: Signals | null;
  error: string | null;
};

const ATTR_RE = /([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(ATTR_RE)) out[m[1].toLowerCase()] = (m[2] ?? m[3] ?? m[4] ?? "").trim();
  return out;
}
const tags = (html: string, name: string) => [...html.matchAll(new RegExp(`<${name}\\b[^>]*>`, "gi"))].map((m) => attrs(m[0]));
const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, " ");
const textOf = (html: string) => decode(html.replace(/<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();

const CTA_RE = /\b(contact|get (a |your )?(quote|started|in touch|demo)|book|schedule|enquire|enquiry|inquire|call (us|now)|request|sign up|subscribe|buy|shop now|order|start (a |your )?(project|trial)|talk to|free (audit|consultation|trial))\b/i;
const ECOMMERCE_RE = /(add[ -]to[ -]cart|\/cart\b|\/checkout\b|cdn\.shopify\.com|woocommerce|bigcommerce|snipcart|data-product-id|razorpay|stripe\.com\/v3)/i;

/** Pure HTML analysis (no network). `finalUrl` decides the https check and which links are internal. */
export function analyzeHtml(html: string, finalUrl: string): { findings: Finding[]; signals: Signals } {
  const findings: Finding[] = [];
  const add = (f: Finding) => findings.push(f);
  const head = html.match(/<head\b[\s\S]*?<\/head>/i)?.[0] ?? html;
  const body = html.match(/<body\b[\s\S]*<\/body>/i)?.[0] ?? html;
  const visible = textOf(body);
  const scriptCount = (html.match(/<script\b/gi) ?? []).length;
  const jsRendered = visible.length < 300 && (scriptCount >= 3 || /<div[^>]+id=["'](root|app|__next|__nuxt)["'][^>]*>\s*<\/div>/i.test(html));
  const contentCertainty: Certainty = jsRendered ? "inferred" : "confirmed";
  const url = new URL(finalUrl);

  // Metadata
  const title = decode(head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/\s+/g, " ").trim();
  if (!title) add({ id: "title-missing", category: "metadata", severity: "high", certainty: "confirmed", title: "Missing page title", evidence: "No <title> in the page head." });
  else if (title.length > 65) add({ id: "title-long", category: "metadata", severity: "low", certainty: "confirmed", title: "Page title is long", evidence: `${title.length} characters; search results cut titles at around 60.` });
  const metas = tags(head, "meta");
  const meta = (key: string) => metas.find((m) => (m.name ?? m.property ?? "").toLowerCase() === key)?.content;
  if (!meta("description")) add({ id: "description-missing", category: "metadata", severity: "medium", certainty: "confirmed", title: "Missing meta description", evidence: 'No <meta name="description"> found.' });
  if (!meta("og:title") || !meta("og:image")) add({ id: "og-missing", category: "metadata", severity: "low", certainty: "confirmed", title: "Incomplete social sharing tags", evidence: "og:title and/or og:image are missing, so shared links show no preview." });
  if (!tags(head, "link").some((l) => (l.rel ?? "").toLowerCase().split(/\s+/).includes("canonical"))) add({ id: "canonical-missing", category: "metadata", severity: "low", certainty: "confirmed", title: "No canonical URL", evidence: 'No <link rel="canonical"> in the head.' });
  const h1s = (body.match(/<h1\b/gi) ?? []).length;
  if (h1s === 0) add({ id: "h1-missing", category: "metadata", severity: "medium", certainty: contentCertainty, title: "No main heading (h1)", evidence: jsRendered ? "No <h1> in the delivered HTML; it may be added by JavaScript." : "No <h1> on the page." });

  // Mobile + accessibility
  const viewport = meta("viewport");
  if (!viewport) add({ id: "viewport-missing", category: "mobile", severity: "high", certainty: "confirmed", title: "Not set up for mobile screens", evidence: 'No <meta name="viewport">: phones render the desktop layout zoomed out.' });
  else {
    if (!/width\s*=\s*device-width/i.test(viewport)) add({ id: "viewport-fixed", category: "mobile", severity: "medium", certainty: "inferred", title: "Viewport may not adapt to phones", evidence: `viewport is "${viewport}" (no width=device-width).` });
    if (/user-scalable\s*=\s*(no|0)|maximum-scale\s*=\s*1(\.0)?\b/i.test(viewport)) add({ id: "zoom-disabled", category: "accessibility", severity: "medium", certainty: "confirmed", title: "Pinch-zoom is disabled", evidence: `viewport is "${viewport}".` });
  }
  if (!attrs(html.match(/<html\b[^>]*>/i)?.[0] ?? "").lang) add({ id: "lang-missing", category: "accessibility", severity: "low", certainty: "confirmed", title: "Page language not declared", evidence: "<html> has no lang attribute." });
  const imgs = tags(body, "img");
  const noAlt = imgs.filter((i) => !("alt" in i)).length;
  if (noAlt > 0) add({ id: "img-alt-missing", category: "accessibility", severity: noAlt > 5 ? "medium" : "low", certainty: "confirmed", title: "Images without alt text", evidence: `${noAlt} of ${imgs.length} images have no alt attribute.` });

  // Security
  if (url.protocol !== "https:") add({ id: "no-https", category: "security", severity: "high", certainty: "confirmed", title: "Site is not served over HTTPS", evidence: `Final address is ${finalUrl}.` });

  // Navigation + conversion
  const anchors: { href?: string; text: string }[] = [...body.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)].map((m) => ({ href: attrs(m[1]).href, text: textOf(m[2]) }));
  const internalLinks = [...new Set(anchors.flatMap((a) => (a.href ? [a.href] : [])).flatMap((href) => {
    if (/^(mailto|tel|javascript|data):/i.test(href) || href.startsWith("#")) return [];
    try {
      const u = new URL(href, url);
      u.hash = "";
      return u.origin === url.origin && u.toString() !== url.toString() ? [u.toString()] : [];
    } catch {
      return [];
    }
  }))];
  const hasNav = /<nav\b/i.test(body) || (body.match(/<header\b[\s\S]*?<\/header>/i)?.[0].match(/<a\b/gi) ?? []).length >= 2;
  if (!hasNav) add({ id: "nav-missing", category: "navigation", severity: "medium", certainty: "inferred", title: "No clear navigation menu", evidence: "No <nav> element or header links in the delivered HTML." });
  const buttons = [...body.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map((m) => textOf(m[1]));
  const ctaCount = [...anchors.map((a) => a.text), ...buttons].filter((t) => CTA_RE.test(t)).length;
  if (ctaCount === 0) add({ id: "cta-missing", category: "conversion", severity: "high", certainty: "inferred", title: "No obvious call to action", evidence: "No link or button with text like Contact, Get a quote or Book. It may be an image or added by JavaScript." });
  const contactForm = /<form\b[\s\S]*?(type=["']?email|name=["']?(email|phone|message))/i.test(body);

  // Performance + rendering caveat
  if (html.length > 500_000) add({ id: "page-heavy", category: "performance", severity: "low", certainty: "inferred", title: "Heavy HTML document", evidence: `${Math.round(html.length / 1024)} KB of HTML before images and scripts.` });
  if (jsRendered) add({ id: "js-rendered", category: "performance", severity: "low", certainty: "inferred", title: "Content depends on JavaScript", evidence: `Only ${visible.length} characters of text in the HTML (${scriptCount} scripts). Search engines and slow phones may see little; some checks above are inferred.` });

  return { findings, signals: { title: title || null, ecommerce: ECOMMERCE_RE.test(html), contactForm, jsRendered, ctaCount, internalLinks } };
}

const LINK_CHECKS = 5;

/** Checks up to 5 internal links (robots-permitted) for hard errors. 401/403/405/429 prove nothing, so they're skipped. */
async function checkLinks(links: string[], opts: FetchOptions): Promise<Finding[]> {
  const out: Finding[] = [];
  for (const link of links.slice(0, LINK_CHECKS)) {
    const u = new URL(link);
    if (!(await robotsAllows(u, opts))) continue;
    try {
      const { res } = await safeRequest(link, "HEAD", opts);
      await res.body?.cancel();
      if (res.status >= 400 && ![401, 403, 405, 429].includes(res.status)) {
        out.push({ id: `broken-link:${u.pathname}`, category: "navigation", severity: "high", certainty: "confirmed", title: "Broken internal link", evidence: `${u.pathname} returns HTTP ${res.status}.` });
      }
    } catch (e) {
      out.push({ id: `link-unreachable:${u.pathname}`, category: "navigation", severity: "medium", certainty: "inferred", title: "Internal link did not respond", evidence: `${u.pathname}: ${(e as Error).message}. Could be temporary.` });
    }
  }
  return out;
}

/** Full analysis of one public URL: safe fetch → HTML findings → internal link check. Never throws. */
export async function analyzeWebsite(url: string, opts: FetchOptions = {}): Promise<Analysis> {
  const page = await fetchPage(url, opts);
  if (!page.ok) {
    const status: AnalysisStatus = page.kind === "unsafe_url" ? "error" : page.kind;
    return { status, url, finalUrl: page.finalUrl ?? null, httpStatus: page.status ?? null, durationMs: page.ms, bytes: 0, findings: [], signals: null, error: page.error };
  }
  const { findings, signals } = analyzeHtml(page.html, page.finalUrl);
  findings.push(...(await checkLinks(signals.internalLinks, opts)));
  if (page.truncated) findings.push({ id: "page-truncated", category: "performance", severity: "low", certainty: "inferred", title: "Page larger than the analysis limit", evidence: "Only the first 1.5 MB was analysed." });
  return { status: "ok", url, finalUrl: page.finalUrl, httpStatus: page.status, durationMs: page.ms, bytes: page.bytes, findings, signals: { ...signals, internalLinks: signals.internalLinks.slice(0, 20) }, error: null };
}

