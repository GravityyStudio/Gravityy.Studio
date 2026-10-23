// Lead scoring, rules-v1: deterministic and explainable. Every point comes with a reason that is stored
// in lead_scores.factors, so anyone can see why a lead scored what it did. No imports: safe anywhere, easy to test.

export type Factor = { factor: string; points: number };
export type Score = { score: number; qualification: "unqualified" | "mql"; factors: Factor[] };
export type ScoreInput = { source: "contact" | "audit"; name: string; message: string; businessDomain: string | null; website: string | null };

export const MQL_THRESHOLD = 50;

const RULES: [string, number, (i: ScoreInput) => boolean][] = [
  ["Business email domain", 20, (i) => i.businessDomain !== null],
  ["Requested a free audit", 15, (i) => i.source === "audit"],
  ["Sent a project enquiry", 10, (i) => i.source === "contact"],
  ["Shared their website", 10, (i) => i.website !== null],
  ["Detailed brief (120+ characters)", 10, (i) => i.message.trim().length >= 120],
  ["Mentions a budget", 15, (i) => /(budget|₹|\$|\binr\b|\busd\b|\blakh|\blac\b|\bcrore|\d+\s?k\b)/i.test(i.message)],
  ["Mentions a timeline", 10, (i) => /\b(asap|urgent|deadline|launch|by (jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)|\d+\s?(day|week|month)s?|this (week|month|quarter)|next (week|month|quarter))/i.test(i.message)],
  ["Names a service we offer", 10, (i) => /\b(website|web ?app|mobile app|app|e-?commerce|shopify|seo|automation|crm|brand(ing)?|dashboard|analytics|ui\/?ux|saas)\b/i.test(i.message)],
  ["Gave a full name", 5, (i) => i.name.trim().split(/\s+/).length >= 2],
];

export function scoreLead(input: ScoreInput): Score {
  const factors = RULES.filter(([, , test]) => test(input)).map(([factor, points]) => ({ factor, points }));
  const score = Math.min(100, factors.reduce((sum, f) => sum + f.points, 0));
  return { score, qualification: score >= MQL_THRESHOLD ? "mql" : "unqualified", factors };
}
