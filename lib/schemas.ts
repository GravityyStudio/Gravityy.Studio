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

// Field order = form order, so the first error reported (and focused) is the first field on screen.
export const auditSchema = z.object({
  url: z.string().trim().max(500).regex(URL_RE, "Enter a valid website URL."),
  email,
  website: z.string().optional(),
});

export const newsletterSchema = z.object({ email, website: z.string().optional() });
