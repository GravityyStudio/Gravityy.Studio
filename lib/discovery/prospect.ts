import { z } from "zod";
import { domainOf, normaliseWebsite } from "@/lib/domain";
import { SIZE_BANDS } from "./scoring";

// Company-level prospect fields only. There is deliberately no field for a person's name, email or phone:
// discovery never collects personal contact data (no lawful basis has been established for it).

const blank = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const text = (max: number) => z.preprocess(blank, z.string().trim().max(max).optional());

export const prospectInputSchema = z.object({
  name: z.string().trim().min(1, "Company name is required.").max(200, "Company name is too long."),
  website: z.preprocess(blank, z.string().trim().max(300).optional()).refine((v) => !v || normaliseWebsite(v) !== null, "Enter a valid website, e.g. acme.com."),
  industry: text(120),
  category: text(120),
  city: text(120),
  region: text(120),
  country: z.preprocess(blank, z.string().trim().toUpperCase().regex(/^[A-Z]{2}$/, "Use a 2-letter country code, e.g. IN.").optional()),
  size_band: z.preprocess(blank, z.enum(SIZE_BANDS, { errorMap: () => ({ message: `Size must be one of ${SIZE_BANDS.join(", ")}.` }) }).optional()),
  intent_signals: z.array(z.string().trim().toLowerCase().regex(/^[a-z_]{2,40}$/, "Intent signals use lowercase words with underscores.")).max(10).default([]),
  notes: text(2000),
});
export type ProspectInput = z.input<typeof prospectInputSchema>;

/** Validated input → database row fields (normalised website + dedupe domain). */
export function toProspectFields(input: z.output<typeof prospectInputSchema>) {
  const website = normaliseWebsite(input.website);
  return {
    name: input.name,
    website,
    domain: domainOf(website),
    industry: input.industry ?? null,
    category: input.category ?? null,
    city: input.city ?? null,
    region: input.region ?? null,
    country: input.country ?? null,
    size_band: input.size_band ?? null,
    intent_signals: [...new Set(input.intent_signals)],
    notes: input.notes ?? null,
  };
}
export type ProspectFields = ReturnType<typeof toProspectFields>;

/** Splits "a; b | c" lists from CSV cells and form inputs. */
export const splitList = (v: string | undefined) => (v ?? "").split(/[;|,]/).map((s) => s.trim().toLowerCase().replace(/\s+/g, "_")).filter(Boolean);
