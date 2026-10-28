import { randomBytes } from "node:crypto";
import { analyzeWebsite } from "@/lib/discovery/analyze";
import { sendAuditEmail, sendEmail } from "@/lib/email";
import { SITE } from "@/lib/seo";
import { createSupabaseService } from "@/lib/supabase/service";
import { runPagespeed, type PsiSummary } from "./pagespeed";

const normalize = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const host = (url: string) => {
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url;
  }
};

/**
 * The free audit, run in the background after the form has been accepted (validated, honeypot, rate limited):
 * 1. store a queued row with an unguessable report token;
 * 2. PageSpeed (mobile + desktop, on Google's servers) and our on-page checks (SSRF-safe fetch, respects robots.txt);
 * 3. save the results, email the requester their report link (owner-approved) and notify the studio.
 * The requester is only emailed when Google's speed test produced scores (on-page checks alone would read as an empty
 * report); otherwise the audit is marked failed and the studio is told to follow up by hand.
 */
export async function runAudit(input: { url: string; email: string }) {
  const db = createSupabaseService();
  const url = normalize(input.url.trim());
  const token = randomBytes(24).toString("base64url");
  const reportUrl = `${SITE}/audit/${token}`;
  const { data: row, error } = await db.from("site_audits").insert({ token, url, email: input.email.toLowerCase(), status: "running" }).select("id").single();
  if (error || !row) throw new Error(`audit not stored: ${error?.message}`);

  const [mobile, desktop, page] = await Promise.allSettled([runPagespeed(url, "mobile"), runPagespeed(url, "desktop"), analyzeWebsite(url)]);
  const psi = {
    mobile: mobile.status === "fulfilled" ? mobile.value : null,
    desktop: desktop.status === "fulfilled" ? desktop.value : null,
  } satisfies Record<string, PsiSummary | null>;
  const analysis = page.status === "fulfilled" ? page.value : null;
  const errors = [mobile, desktop, page].flatMap((r) => (r.status === "rejected" ? [String(r.reason instanceof Error ? r.reason.message : r.reason)] : []));
  if (analysis && analysis.status !== "ok") errors.push(`on-page: ${analysis.status}${analysis.error ? ` (${analysis.error})` : ""}`);
  const measured = Boolean(psi.mobile || psi.desktop);

  await db
    .from("site_audits")
    .update({ status: measured ? "done" : "failed", psi, findings: analysis?.status === "ok" ? analysis.findings : null, error: errors.join(" | ") || null, completed_at: new Date().toISOString() })
    .eq("id", row.id);

  if (measured) {
    await sendAuditEmail({ to: input.email, site: host(url), reportUrl, mobile: psi.mobile?.scores.performance ?? null, desktop: psi.desktop?.scores.performance ?? null });
    await db.from("site_audits").update({ emailed_at: new Date().toISOString() }).eq("id", row.id);
  }
  await sendEmail(measured ? "Free audit sent" : "Free audit FAILED: follow up by hand", {
    site: url,
    email: input.email,
    report: reportUrl,
    ...(errors.length ? { problems: errors.join(" | ") } : {}),
  });
}
