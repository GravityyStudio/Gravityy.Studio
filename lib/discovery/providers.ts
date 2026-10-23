import { domainOf, normaliseWebsite } from "@/lib/domain";

// Discovery sources and their usage/retention policies. Directory data is never assumed to be storable:
// each provider declares how long its results may be kept (prospects.expires_at, enforced by
// crm_purge_expired) and which fields may be copied into the CRM when an admin approves a prospect.
// API providers are OFF unless their key is configured, which is the owner's explicit decision (paid services).

export type PersistField = "name" | "domain" | "website" | "industry" | "country" | "size_band";
export type ProviderPolicy = {
  retentionDays: number | null; // null = no provider limit (data the workspace supplied itself)
  persistable: PersistField[];
  attribution?: string;
  termsUrl?: string;
  note: string;
};
export type DiscoveryQuery = { category: string; location: string; max: number };
export type ProviderResult = {
  name: string;
  website: string | null;
  domain: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  provider_ref: string;
};
export type Provider = { id: string; label: string; policy: ProviderPolicy; enabled: () => boolean; search: (q: DiscoveryQuery) => Promise<ProviderResult[]> };

const ALL_FIELDS: PersistField[] = ["name", "domain", "website", "industry", "country", "size_band"];
export const SOURCE_POLICIES: Record<"manual" | "csv_upload", ProviderPolicy> = {
  manual: { retentionDays: null, persistable: ALL_FIELDS, note: "Entered by your team." },
  csv_upload: { retentionDays: null, persistable: ALL_FIELDS, note: "Imported by your team; you are responsible for the source and its terms." },
};

// ---------- Google Places API (New), Text Search ----------
// Terms: place IDs may be stored indefinitely; other Places content may be cached for at most 30 days.
// So prospects expire after 30 days, and only the company's own website/domain (a fact anyone can verify
// independently) is copied into the CRM. Verify field names against Google's current docs before enabling.
type PlacesResponse = {
  places?: { id: string; displayName?: { text?: string }; websiteUri?: string; primaryTypeDisplayName?: { text?: string }; types?: string[]; addressComponents?: { longText?: string; shortText?: string; types?: string[] }[] }[];
  nextPageToken?: string;
  error?: { message?: string };
};
const component = (p: NonNullable<PlacesResponse["places"]>[number], type: string, short = false) => {
  const c = p.addressComponents?.find((a) => a.types?.includes(type));
  return (short ? c?.shortText : c?.longText) ?? null;
};

export const googlePlaces: Provider = {
  id: "google_places",
  label: "Google Places",
  policy: {
    retentionDays: 30,
    persistable: ["domain", "website"],
    attribution: "Business listings from Google",
    termsUrl: "https://cloud.google.com/maps-platform/terms",
    note: "Listing details expire after 30 days unless the prospect is approved; only the company's own website is kept.",
  },
  enabled: () => Boolean(process.env.GOOGLE_PLACES_API_KEY),
  async search({ category, location, max }) {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) throw new Error("Google Places is not configured (GOOGLE_PLACES_API_KEY).");
    const out: ProviderResult[] = [];
    let pageToken: string | undefined;
    do {
      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": key,
          "x-goog-fieldmask": "places.id,places.displayName,places.websiteUri,places.primaryTypeDisplayName,places.types,places.addressComponents,nextPageToken",
        },
        body: JSON.stringify({ textQuery: `${category} in ${location}`, pageSize: Math.min(20, max - out.length), ...(pageToken ? { pageToken } : {}) }),
        signal: AbortSignal.timeout(15_000),
      });
      const json = (await res.json()) as PlacesResponse;
      if (!res.ok) throw new Error(`Google Places: ${json.error?.message ?? `HTTP ${res.status}`}`);
      for (const p of json.places ?? []) {
        if (!p.id || !p.displayName?.text) continue;
        const website = normaliseWebsite(p.websiteUri);
        out.push({
          name: p.displayName.text.slice(0, 200),
          website,
          domain: domainOf(website),
          category: (p.primaryTypeDisplayName?.text ?? p.types?.[0]?.replace(/_/g, " ") ?? null)?.slice(0, 120) ?? null,
          city: component(p, "locality"),
          region: component(p, "administrative_area_level_1"),
          country: component(p, "country", true)?.toUpperCase() ?? null,
          provider_ref: p.id,
        });
      }
      pageToken = json.nextPageToken;
    } while (pageToken && out.length < max);
    return out.slice(0, max);
  },
};

export const PROVIDERS: Provider[] = [googlePlaces];
export const providerById = (id: string) => PROVIDERS.find((p) => p.id === id);

/** Usage policy for a stored prospect. Unknown providers get the strictest default (no copying, 30 days). */
export function policyFor(source: string, provider: string): ProviderPolicy {
  if (source === "manual" || source === "csv_upload") return SOURCE_POLICIES[source];
  return providerById(provider)?.policy ?? { retentionDays: 30, persistable: ["domain", "website"], note: "Unknown provider: strictest defaults applied." };
}

/** Fields an admin approval may copy into the CRM, per the prospect's provider policy. */
export function crmFieldsFor(
  p: { source: string; provider: string; name: string; domain: string | null; website: string | null; industry: string | null; country: string | null; size_band: string | null },
  qualified: boolean,
) {
  const allowed = new Set(policyFor(p.source, p.provider).persistable);
  const pick = <K extends PersistField>(k: K) => (allowed.has(k) ? p[k] : null);
  return { company: { name: pick("name"), domain: pick("domain"), website: pick("website"), industry: pick("industry"), country: pick("country"), size_band: pick("size_band") }, qualification: qualified ? ("mql" as const) : ("unqualified" as const) };
}

/** expires_at for a newly discovered prospect, or null when the source has no retention limit. */
export const expiresAt = (policy: ProviderPolicy, now = new Date()) => (policy.retentionDays === null ? null : new Date(now.getTime() + policy.retentionDays * 864e5).toISOString());
