import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

// Polite, safe fetching of public web pages for website analysis.
// - Only http(s) on standard ports, and only to public IP addresses (blocks SSRF into private networks / cloud metadata).
// - Every redirect hop is re-validated; at most 3 hops.
// - robots.txt is obeyed (RFC 9309) for our user agent.
// - Access challenges, logins and rate limits are reported as "blocked" and never retried or worked around.
// - Hard time and size caps; no JavaScript is executed.

export const USER_AGENT = "GravityyStudioBot/1.0 (+https://www.gravityystudio.com/contact)";
const BOT_TOKEN = "gravityystudiobot";
const PAGE_MAX_BYTES = 1_500_000;
const ROBOTS_MAX_BYTES = 64_000;
const TIMEOUT_MS = 8000;
const MAX_REDIRECTS = 3;

export type FetchOptions = { allowPrivateNetwork?: boolean }; // tests only; never set from user input
export type PageResult =
  | { ok: true; url: string; finalUrl: string; status: number; html: string; bytes: number; truncated: boolean; ms: number }
  | { ok: false; kind: "unsafe_url" | "robots_disallowed" | "blocked" | "not_html" | "error"; url: string; finalUrl?: string; status?: number; error: string; ms: number };

// ---------- address safety ----------
function ipv4ToInt(ip: string) {
  return ip.split(".").reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}
const V4_BLOCKED: [string, number][] = [
  ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8], ["169.254.0.0", 16], ["172.16.0.0", 12],
  ["192.0.0.0", 24], ["192.0.2.0", 24], ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
  ["224.0.0.0", 4], ["240.0.0.0", 4],
];
/** True only for globally routable unicast addresses. */
export function isPublicIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const n = ipv4ToInt(ip);
    return !V4_BLOCKED.some(([base, bits]) => (n >>> (32 - bits)) === (ipv4ToInt(base) >>> (32 - bits)));
  }
  if (v === 6) {
    const a = ip.toLowerCase();
    const mapped = a.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isPublicIp(mapped[1]);
    if (a === "::" || a === "::1") return false;
    return !/^(fc|fd|fe8|fe9|fea|feb|ff|2001:db8|64:ff9b)/.test(a);
  }
  return false;
}

/** Validates scheme, port and every resolved address. ponytail: DNS can change between this check and the
 * connection (rebinding); pin the resolved IP with a custom dispatcher if this ever fetches untrusted input at scale. */
export async function assertSafeUrl(raw: string, opts: FetchOptions = {}): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("Not a valid URL");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https URLs are analysed");
  if (url.username || url.password) throw new Error("URLs with credentials are not analysed");
  if (url.port && !["80", "443"].includes(url.port) && !opts.allowPrivateNetwork) throw new Error("Non-standard ports are not analysed");
  if (opts.allowPrivateNetwork) return url;
  const host = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (!addresses.length || !addresses.every(isPublicIp)) throw new Error("Address is not on the public internet");
  return url;
}

// ---------- low-level GET with caps ----------
async function readCapped(res: Response, maxBytes: number) {
  if (!res.body) return { text: "", bytes: 0, truncated: false };
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  let truncated = false;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > maxBytes) {
      chunks.push(value.subarray(0, value.byteLength - (bytes - maxBytes)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return { text: new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks)), bytes: Math.min(bytes, maxBytes), truncated };
}

/** GET/HEAD following up to 3 redirects, re-checking each hop. Returns the final response (body unread). */
export async function safeRequest(raw: string, method: "GET" | "HEAD", opts: FetchOptions = {}) {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await assertSafeUrl(current, opts);
    const res = await fetch(url, {
      method,
      redirect: "manual",
      headers: { "user-agent": USER_AGENT, accept: method === "GET" ? "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1" : "*/*" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const location = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && location) {
      await res.body?.cancel();
      current = new URL(location, url).toString();
      continue;
    }
    return { res, finalUrl: url.toString() };
  }
  throw new Error(`More than ${MAX_REDIRECTS} redirects`);
}

// ---------- robots.txt (RFC 9309) ----------
type Rule = { allow: boolean; path: string };

/** Rules that apply to our bot: its own group if present, else the "*" group. */
export function parseRobots(text: string): Rule[] {
  const groups: { agents: string[]; rules: Rule[] }[] = [];
  let current: { agents: string[]; rules: Rule[] } | null = null;
  let lastWasAgent = false;
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    const m = line.match(/^([a-z-]+)\s*:\s*(.*)$/i);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key === "user-agent") {
      if (!current || !lastWasAgent) groups.push((current = { agents: [], rules: [] }));
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
    } else if ((key === "allow" || key === "disallow") && current) {
      if (value) current.rules.push({ allow: key === "allow", path: value });
      lastWasAgent = false;
    } else {
      lastWasAgent = false;
    }
  }
  const mine = groups.filter((g) => g.agents.some((a) => a.split("/")[0].trim() === BOT_TOKEN));
  return (mine.length ? mine : groups.filter((g) => g.agents.includes("*"))).flatMap((g) => g.rules);
}

function ruleMatches(rulePath: string, path: string) {
  const anchored = rulePath.endsWith("$");
  const pattern = rulePath.replace(/\$$/, "").replace(/[.+?^{}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${pattern}${anchored ? "$" : ""}`).test(path);
}

/** Longest matching rule wins; on a tie, Allow wins. No matching rule = allowed. */
export function isAllowedByRobots(rules: Rule[], pathWithQuery: string): boolean {
  let best: Rule | null = null;
  for (const r of rules) {
    if (!ruleMatches(r.path, pathWithQuery)) continue;
    if (!best || r.path.length > best.path.length || (r.path.length === best.path.length && r.allow)) best = r;
  }
  return best ? best.allow : true;
}

const robotsCache = new Map<string, { rules: Rule[] | "deny-all"; at: number }>();

/** RFC 9309: 4xx → no restrictions; 5xx or unreachable → treat as fully disallowed. Cached 10 minutes per origin. */
export async function robotsAllows(target: URL, opts: FetchOptions = {}): Promise<boolean> {
  const origin = target.origin;
  let entry = robotsCache.get(origin);
  if (!entry || Date.now() - entry.at > 600_000) {
    let rules: Rule[] | "deny-all";
    try {
      const { res } = await safeRequest(`${origin}/robots.txt`, "GET", opts);
      if (res.status >= 500) rules = "deny-all";
      else if (res.status >= 400) rules = [];
      else rules = parseRobots((await readCapped(res, ROBOTS_MAX_BYTES)).text);
    } catch {
      rules = "deny-all";
    }
    entry = { rules, at: Date.now() };
    robotsCache.set(origin, entry);
  }
  return entry.rules !== "deny-all" && isAllowedByRobots(entry.rules, target.pathname + target.search);
}

// ---------- page fetch ----------
const CHALLENGE_RE = /(cf-browser-verification|challenge-platform|cf_chl_|g-recaptcha|h-captcha|hcaptcha|captcha|just a moment\.\.\.|attention required|verify you are human|access denied)/i;

export async function fetchPage(raw: string, opts: FetchOptions = {}): Promise<PageResult> {
  const started = Date.now();
  const ms = () => Date.now() - started;
  let url: URL;
  try {
    url = await assertSafeUrl(raw, opts);
  } catch (e) {
    return { ok: false, kind: "unsafe_url", url: raw, error: (e as Error).message, ms: ms() };
  }
  if (!(await robotsAllows(url, opts))) {
    return { ok: false, kind: "robots_disallowed", url: raw, error: "robots.txt does not allow this page to be fetched", ms: ms() };
  }
  try {
    const { res, finalUrl } = await safeRequest(url.toString(), "GET", opts);
    if ([401, 403, 407, 429, 503].includes(res.status)) {
      await res.body?.cancel();
      return { ok: false, kind: "blocked", url: raw, finalUrl, status: res.status, error: `The site refused automated access (HTTP ${res.status}). Not retried.`, ms: ms() };
    }
    const type = res.headers.get("content-type") ?? "";
    if (!/text\/html|application\/xhtml/i.test(type)) {
      await res.body?.cancel();
      return { ok: false, kind: "not_html", url: raw, finalUrl, status: res.status, error: `Not an HTML page (${type || "no content type"})`, ms: ms() };
    }
    const { text, bytes, truncated } = await readCapped(res, PAGE_MAX_BYTES);
    // A short page that is mostly a challenge script is an access check, not the site: stop.
    if (bytes < 60_000 && CHALLENGE_RE.test(text)) {
      return { ok: false, kind: "blocked", url: raw, finalUrl, status: res.status, error: "The site showed an access challenge. Not worked around.", ms: ms() };
    }
    if (res.status >= 400) {
      return { ok: false, kind: "error", url: raw, finalUrl, status: res.status, error: `HTTP ${res.status}`, ms: ms() };
    }
    return { ok: true, url: raw, finalUrl, status: res.status, html: text, bytes, truncated, ms: ms() };
  } catch (e) {
    const msg = e instanceof Error ? (e.name === "TimeoutError" ? "Timed out" : e.message) : "Fetch failed";
    return { ok: false, kind: "error", url: raw, error: msg, ms: ms() };
  }
}
