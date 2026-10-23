// Domain/website normalisation shared by inbound intake and discovery (dedupe keys must match exactly).
// Same rule as the companies.domain / prospects.domain check constraints.
export const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;

/** "acme.com/pricing" or "https://www.acme.com" → "https://acme.com"; anything unparseable → null. */
export function normaliseWebsite(raw?: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return DOMAIN_RE.test(host) ? `https://${host}` : null;
  } catch {
    return null;
  }
}

/** Normalised domain of a website ("https://acme.com" → "acme.com"), or null. */
export const domainOf = (website: string | null) => (website ? website.replace(/^https:\/\//, "") : null);
