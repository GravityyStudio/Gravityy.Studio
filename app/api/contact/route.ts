import { handleForm } from "@/lib/api";
import { contactSchema } from "@/lib/schemas";

export async function POST(req: Request) {
  return handleForm(req, contactSchema, "New project enquiry", "Thanks. We'll reply within one working day.", (f) => ({
    source: "contact",
    name: f.name,
    email: f.email,
    message: f.message,
  }));
}
