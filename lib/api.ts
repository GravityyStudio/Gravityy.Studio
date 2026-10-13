import { NextResponse } from "next/server";
import type { ZodType } from "zod";
import { sendEmail } from "./email";
import { audit } from "./audit";
import { createSupabaseService } from "./supabase/service";

export type LeadInput = { name: string; email: string; company?: string; notes: string; source: "contact" | "audit" };

/** Site form → Leads board (stage "new"). Service role: the visitor has no session. Never blocks the form reply. */
async function createLead(lead: LeadInput) {
  try {
    const db = createSupabaseService();
    const { data, error } = await db.from("leads").insert(lead).select("id").single<{ id: string }>();
    if (error) throw error;
    await audit(db, null, "create", "leads", data.id, { source: lead.source });
  } catch (e) {
    console.error("[leads] not recorded:", e instanceof Error ? e.message : e);
  }
}

/** Shared POST handler: JSON body → zod → honeypot check → lead + email. Always answers JSON. */
export async function handleForm<T extends { website?: string }>(req: Request, schema: ZodType<T>, subject: string, ok: string, lead?: (fields: Omit<T, "website">) => LeadInput) {
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
  // Honeypot filled → pretend success, send nothing.
  if (website) return NextResponse.json({ ok: true, message: ok });
  if (lead) await createLead(lead(fields));
  try {
    await sendEmail(subject, Object.fromEntries(Object.entries(fields).map(([k, v]) => [k, String(v)])));
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "We couldn't send that right now. Email hello@gravityystudio.com." }, { status: 502 });
  }
  return NextResponse.json({ ok: true, message: ok });
}
