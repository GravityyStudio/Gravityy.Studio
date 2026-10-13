import { z } from "zod";

// Same rules and copy as the prototype. `website` is the honeypot: real users never see or fill it.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const URL_RE = /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/i;

const email = z.string().trim().max(254).regex(EMAIL_RE, "Enter a valid email address.");

export const contactSchema = z.object({
  name: z.string().trim().min(1, "Tell us your name.").max(120),
  email,
  message: z.string().trim().min(10, "Add a line or two about the project.").max(5000),
  website: z.string().optional(),
});

export const auditSchema = z.object({
  email,
  url: z.string().trim().max(500).regex(URL_RE, "Enter a valid website URL."),
  website: z.string().optional(),
});

export const newsletterSchema = z.object({ email, website: z.string().optional() });


/** First error message, for single-line form status. */
export function firstError(r: z.SafeParseReturnType<unknown, unknown>) {
  return r.success ? "" : (r.error.issues[0]?.message ?? "Something went wrong.");
}
