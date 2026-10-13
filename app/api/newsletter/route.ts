import { handleForm } from "@/lib/api";
import { newsletterSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handleForm(req, newsletterSchema, "Newsletter signup", "You’re subscribed. First issue lands next month.");
}
