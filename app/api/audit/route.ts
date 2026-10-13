import { handleForm } from "@/lib/api";
import { auditSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handleForm(req, auditSchema, "Free audit request", "Got it. Your audit will arrive within 3 working days.", (f) => ({
    name: f.url.replace(/^https?:\/\//i, "").split("/")[0],
    email: f.email,
    company: f.url,
    notes: `Free audit requested for ${f.url}`,
    source: "audit",
  }));
}
