import { after, NextResponse } from "next/server";
import type { ZodType } from "zod";
import { sendEmail } from "./email";
import { allow, clientIp, hashKey } from "./rate-limit";
import { captureLead, type IntakeInput } from "./crm/intake";

// Per-visitor limits for every site form. Real people never get near these.
const PER_IP = { max: 5, windowSeconds: 600 };
const PER_EMAIL = { max: 5, windowSeconds: 3600 };
const TOO_MANY = "Too many submissions. Please wait a few minutes and try again, or email hello@gravityystudio.com.";

/**
 * Shared POST handler: JSON body → zod → honeypot → rate limit → CRM intake → email. Always answers JSON.
 * Intake failures never block the reply: the enquiry still goes out by email and the error is logged.
 * `onAccepted` runs after the response has been sent (next/server `after`), only for real, accepted submissions.
 */
export async function handleForm<T extends { website?: string; email?: string }>(
  req: Request,
  schema: ZodType<T>,
  subject: string,
  ok: string,
  intake?: (fields: Omit<T, "website">) => IntakeInput,
  onAccepted?: (fields: Omit<T, "website">) => Promise<void>,
) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input.", issues: parsed.error.flatten().fieldErrors },
      { status: 422 },
    );
  }
  const { website, ...fields } = parsed.data;
  // Honeypot filled → pretend success, store and send nothing.
  if (website) return NextResponse.json({ ok: true, message: ok });

  const ip = clientIp(req);
  const form = new URL(req.url).pathname;
  const limited =
    !(await allow(`form:ip:${hashKey(ip ?? "unknown")}`, PER_IP.max, PER_IP.windowSeconds)) ||
    (fields.email !== undefined && !(await allow(`form:email:${hashKey(fields.email.toLowerCase())}`, PER_EMAIL.max, PER_EMAIL.windowSeconds)));
  if (limited) {
    console.warn(`[forms] rate limited ${form}`);
    return NextResponse.json({ ok: false, error: TOO_MANY }, { status: 429, headers: { "Retry-After": String(PER_IP.windowSeconds) } });
  }

  if (intake) {
    try {
      await captureLead(intake(fields), { ip, userAgent: req.headers.get("user-agent") });
    } catch (e) {
      console.error("[crm] lead not recorded:", e instanceof Error ? e.message : e);
    }
  }
  try {
    await sendEmail(subject, Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)])));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "We couldn't send that right now. Email hello@gravityystudio.com." }, { status: 502 });
  }
  if (onAccepted)
    after(() =>
      onAccepted(fields).catch((e) => console.error(`[forms] ${form} follow-up failed:`, e instanceof Error ? e.message : e)),
    );
  return NextResponse.json({ ok: true, message: ok });
}
