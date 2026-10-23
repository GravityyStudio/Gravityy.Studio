import { handleForm } from "@/lib/api";
import { auditSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handleForm(req, auditSchema, "Free audit request", "Got it. Your audit will arrive within 3 working days.", (f) => ({
    source: "audit",
    email: f.email,
    website: f.url,
    message: `Free audit requested for ${f.url}`,
  }));
}
