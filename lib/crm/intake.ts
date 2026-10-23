import { createHmac } from "node:crypto";
import { z } from "zod";
import { createSupabaseService } from "@/lib/supabase/service";
import { DOMAIN_RE, normaliseWebsite } from "@/lib/domain";
import { scoreLead } from "./scoring";
import type { Database } from "@/lib/supabase/database.types";

// The type generator marks every function parameter non-null (Postgres can't declare otherwise);
// crm_intake handles nulls for the optional fields, so they are widened here and nowhere else.
type IntakeArgs = Database["public"]["Functions"]["crm_intake"]["Args"];
type Nullable<T> = { [K in keyof T]: T[K] | null };

export { normaliseWebsite };

// Personal mailbox providers: an address here says nothing about the person's company.
const FREE_MAIL = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.in", "ymail.com", "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com", "aol.com", "proton.me", "protonmail.com", "zoho.com", "zohomail.in", "rediffmail.com",
  "gmx.com", "gmx.net", "yandex.com", "mail.com", "hey.com", "fastmail.com",
]);

/** Server-side contract for an inbound submission (routes have already applied the stricter form schemas). */
export const intakeSchema = z.object({
  source: z.enum(["contact", "audit"]),
  name: z.string().trim().max(120).default(""),
  email: z.string().trim().toLowerCase().max(254).email(),
  message: z.string().trim().max(5000).default(""),
  website: z.string().trim().max(500).optional(),
});
export type IntakeInput = z.input<typeof intakeSchema>;
export type IntakeMeta = { ip: string | null; userAgent: string | null };
export type IntakeResult = { leadId: string; contactId: string; companyId: string | null; suppressed: boolean; score: number };

/** Business domain of an email address, or null for free-mail providers. */
export function businessDomain(email: string): string | null {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return DOMAIN_RE.test(domain) && !FREE_MAIL.has(domain) ? domain : null;
}

/** Keyed hash so stored IPs can't be reversed by brute-forcing the IPv4 space. Null when no secret is configured. */
function hashIp(ip: string | null): string | null {
  const secret = process.env.IP_HASH_SECRET;
  return ip && secret ? createHmac("sha256", secret).update(ip).digest("hex") : null;
}

/**
 * Inbound lead capture: validate → normalise → score → one atomic `crm_intake` call (company + contact dedupe,
 * lead, score history, activity, enquiry consent, outbox event, audit). Server only: uses the service role.
 */
export async function captureLead(raw: IntakeInput, meta: IntakeMeta): Promise<IntakeResult> {
  const input = intakeSchema.parse(raw);
  const website = normaliseWebsite(input.website);
  const emailDomain = businessDomain(input.email);
  const domain = emailDomain ?? (website ? website.slice("https://".length) : null);
  const { score, qualification, factors } = scoreLead({ source: input.source, name: input.name, message: input.message, businessDomain: emailDomain, website });

  const args: Nullable<IntakeArgs> = {
    p_source: input.source,
    p_name: input.name,
    p_email: input.email,
    p_company_name: null,
    p_domain: domain,
    p_website: website,
    p_message: input.message || null,
    p_score: score,
    p_factors: factors,
    p_qualification: qualification,
    p_ip_hash: hashIp(meta.ip),
    p_user_agent: meta.userAgent?.slice(0, 300) ?? null,
  };
  const { data, error } = await createSupabaseService().rpc("crm_intake", args as IntakeArgs);
  if (error) throw new Error(`crm_intake failed: ${error.message}`);
  const out = data as { lead_id: string; contact_id: string; company_id: string | null; suppressed: boolean };
  return { leadId: out.lead_id, contactId: out.contact_id, companyId: out.company_id, suppressed: out.suppressed, score };
}
