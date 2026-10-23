"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { emitEvent } from "@/lib/events/contracts";
import { createSupabaseService } from "@/lib/supabase/service";
import { sendingEnabled } from "@/lib/automation/actions";
import { dispatchOutbox } from "@/lib/automation/dispatch";

// Outreach review + automation recovery. Draft edits and approvals go through the admin's own session, so RLS and
// the outreach guard (version bump on edit, approval pinned to a version) apply. Results come back as ?ok= / ?error=.

const ID = z.string().uuid();
const back = (tab: FormDataEntryValue | null) => `/admin/outreach${typeof tab === "string" && /^[a-z]+$/.test(tab) ? `?tab=${tab}&` : "?"}`;

async function run(form: FormData, fn: () => Promise<string>) {
  let to: string;
  try {
    to = `${back(form.get("tab"))}ok=${encodeURIComponent(await fn())}`;
  } catch (e) {
    to = `${back(form.get("tab"))}error=${encodeURIComponent(e instanceof Error ? e.message : "Something went wrong.")}`;
  }
  revalidatePath("/admin/outreach");
  redirect(to);
}
const check = <T>(r: { error: { message: string } | null; data?: T }) => {
  if (r.error) throw new Error(r.error.message);
  return r.data as T;
};

export async function saveDraft(form: FormData) {
  await run(form, async () => {
    const { supabase } = await requireAdmin();
    const v = z.object({ id: ID, subject: z.string().trim().min(1).max(200), body: z.string().trim().min(1).max(20000) }).parse(Object.fromEntries(form));
    check(await supabase.from("outreach_drafts").update({ subject: v.subject, body: v.body }).eq("id", v.id));
    return "Draft saved. Edits to an approved draft send it back for approval.";
  });
}

export async function approveDraft(form: FormData) {
  await run(form, async () => {
    const { supabase, user } = await requireAdmin();
    const id = ID.parse(form.get("id"));
    check(await supabase.from("outreach_drafts").update({ status: "approved" }).eq("id", id));
    await audit(supabase, user, "approve", "outreach_drafts", id);
    return "Draft approved. It is not sent until you press Send.";
  });
}

export async function rejectDraft(form: FormData) {
  await run(form, async () => {
    const { supabase, user } = await requireAdmin();
    const id = ID.parse(form.get("id"));
    const reason = z.string().trim().max(500).parse(form.get("reason") ?? "") || null;
    check(await supabase.from("outreach_drafts").update({ status: "rejected", rejected_reason: reason }).eq("id", id));
    await audit(supabase, user, "reject", "outreach_drafts", id, { reason });
    return "Draft rejected.";
  });
}

/** The explicit administrator send action. The database re-checks approval, version and eligibility. */
export async function requestSend(form: FormData) {
  await run(form, async () => {
    const { supabase } = await requireAdmin();
    if (!sendingEnabled()) throw new Error("Sending is turned off (OUTREACH_SENDING_ENABLED). Nothing was sent.");
    const id = ID.parse(form.get("id"));
    check(await supabase.rpc("outreach_request_send", { p_draft: id }));
    return "Send queued. The Gmail workflow re-checks eligibility and limits, then records the result here.";
  });
}

export async function requestDraft(form: FormData) {
  await run(form, async () => {
    const { supabase, user } = await requireAdmin();
    const v = z.object({ lead_id: ID, purpose: z.enum(["reply", "outreach"]) }).parse(Object.fromEntries(form));
    const lead = check(await supabase.from("leads").select("id, workspace_id, contact_id").eq("id", v.lead_id).single()) as { id: string; workspace_id: string; contact_id: string | null };
    if (!lead.contact_id) throw new Error("This lead has no contact record.");
    await emitEvent(createSupabaseService(), "outreach.draft_requested", lead.workspace_id, { contact_id: lead.contact_id, lead_id: lead.id, purpose: v.purpose }, lead.contact_id);
    await audit(supabase, user, "request_draft", "leads", lead.id, { purpose: v.purpose });
    return "Draft requested. It appears under Review once the n8n workflow has run.";
  });
}

export async function requeueEvent(form: FormData) {
  await run(form, async () => {
    const { supabase } = await requireAdmin();
    check(await supabase.rpc("outbox_requeue", { p_id: ID.parse(form.get("id")) }));
    return "Event requeued.";
  });
}

export async function dispatchNow(form: FormData) {
  await run(form, async () => {
    await requireAdmin();
    const r = await dispatchOutbox(10);
    if (!r.configured) throw new Error("n8n is not configured (N8N_WEBHOOK_BASE_URL / N8N_OUTBOUND_SECRET). Events stay queued.");
    return `Processed ${r.claimed}: ${r.delivered} delivered, ${r.failed} will retry, ${r.dead} dead.`;
  });
}
