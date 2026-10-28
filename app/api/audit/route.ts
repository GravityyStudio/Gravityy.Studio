import { handleForm } from "@/lib/api";
import { runAudit } from "@/lib/audit/run";
import { auditSchema } from "@/lib/schemas";

// The audit (PageSpeed mobile + desktop in parallel, on-page checks, email) runs after the response, within this limit.
export const maxDuration = 60;

export async function POST(req: Request) {
  return handleForm(
    req,
    auditSchema,
    "Free audit request",
    "Got it. Your audit is running: the report arrives by email in a few minutes.",
    (f) => ({ source: "audit", email: f.email, website: f.url, message: `Free audit requested for ${f.url}` }),
    (f) => runAudit({ url: f.url, email: f.email }),
  );
}
