import type { Finding } from "@/lib/discovery/analyze";
import type { ScoreResult } from "@/lib/discovery/scoring";

// Plain, serialisable view models passed from the server page to the client dashboard.
export type ProspectView = {
  id: string;
  name: string;
  domain: string | null;
  website: string | null;
  industry: string | null;
  category: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  size_band: string | null;
  source: string;
  provider: string;
  intent_signals: string[];
  research_status: string;
  review_status: string;
  score: number | null;
  breakdown: ScoreResult | null;
  company_id: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
  policy: { note: string; persistable: string[]; attribution: string | null; retentionDays: number | null };
};

export type AnalysisView = {
  status: string;
  http_status: number | null;
  final_url: string | null;
  created_at: string;
  findings: Finding[];
  error: string | null;
};

export type ProviderView = { id: string; label: string; enabled: boolean; note: string };
export type ScoringView = { weights: Record<"industryFit" | "websiteNeeds" | "projectBudget" | "purchaseIntent", number>; targetIndustries: string[]; adjacentIndustries: string[]; qualifyThreshold: number };

export const location = (p: Pick<ProspectView, "city" | "region" | "country">) => [p.city, p.region, p.country].filter(Boolean).join(", ") || null;

export type Filters = {
  q?: string;
  industry?: string;
  category?: string;
  location?: string;
  review: "all" | "pending" | "approved" | "rejected";
  research: "any" | "new" | "analyzing" | "analyzed" | "failed" | "blocked";
  source: "any" | "manual" | "csv_upload" | "api";
  min: number;
};
