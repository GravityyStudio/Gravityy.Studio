import { z } from "zod";
import type { createSupabaseService } from "@/lib/supabase/service";
import { sendEmail } from "@/lib/email";
import { analyzeProspect, workspaceId } from "@/lib/discovery/service";
import { dispatchOutbox } from "./dispatch";
import { followupDraft, outreachDraft, replyDraft } from "./drafts";
import { reoonEnabled, verifyEmail } from "./reoon";

// Signed callbacks n8n makes into the app (POST /api/automation/<action>). n8n only orchestrates: every rule
// (eligibility, suppression, approval, sending limits) is enforced here or in the database. Every action is
// safe to repeat, so n8n node retries and outbox re-deliveries never double-apply.

type Db = ReturnType<typeof createSupabaseService>;
const id = z.string().uuid();
const action = <S extends z.ZodTypeAny>(schema: S, run: (db: Db, input: z.infer<S>) => Promise<Record<string, unknown>>) => ({ schema, run });
// Throws on a query error. Callers use .single() (missing row = error) or ignore the result, so data is present.
const must = <T>(r: { data: T; error: { message: string } | null }, what: string) => {
  if (r.error) throw new Error(`${what}: ${r.error.message}`);
  return r.data as NonNullable<T>;
};

export const WORKFLOWS = ["A-inbound-lead", "B-outbound-research", "C-outreach-draft", "D-gmail-send", "E-follow-up", "ops-outbox-pump", "errors"] as const;
const OPEN = ["draft", "pending_approval", "approved"];

export const sendingEnabled = () => process.env.OUTREACH_SENDING_ENABLED === "true";
const dailyLimit = () => Math.min(200, Math.max(1, Number(process.env.OUTREACH_DAILY_LIMIT) || 20));

export const ACTIONS = {
  /** Idempotency + execution log: one automation_runs row per (workflow, event id). A finished run is a duplicate. */
  "run.start": action(
    z.object({ workflow: z.enum(WORKFLOWS), key: z.string().min(1).max(200), trigger: z.enum(["outbox", "schedule", "manual", "webhook"]), input: z.record(z.unknown()).default({}) }).strict(),
    async (db, i) => {
      const lookup = await db.from("automation_runs").select("id, status, started_at").eq("workflow", i.workflow).eq("external_run_id", i.key).maybeSingle();
      if (lookup.error) throw new Error(`run lookup: ${lookup.error.message}`);
      const existing = lookup.data;
      if (existing?.status === "succeeded") return { duplicate: true, run_id: existing.id };
      // Still running and recent: another delivery is processing it.
      if (existing?.status === "running" && Date.now() - Date.parse(existing.started_at) < 10 * 60_000) return { duplicate: true, run_id: existing.id };
      if (existing) {
        must(await db.from("automation_runs").update({ status: "running", error: null, finished_at: null, started_at: new Date().toISOString(), input: i.input as never }).eq("id", existing.id), "run retry");
        return { duplicate: false, run_id: existing.id, retry: true };
      }
      const created = await db.from("automation_runs")
        .insert({ workspace_id: await workspaceId(db), workflow: i.workflow, trigger: i.trigger, external_run_id: i.key, input: i.input as never })
        .select("id").single();
      if (created.error?.code === "23505") return { duplicate: true };
      return { duplicate: false, run_id: must(created, "run insert").id };
    },
  ),

  "run.finish": action(
    z.object({ workflow: z.enum(WORKFLOWS), key: z.string().min(1).max(200), status: z.enum(["succeeded", "failed", "cancelled"]), output: z.record(z.unknown()).default({}), error: z.string().max(4000).optional() }).strict(),
    async (db, i) => {
      must(await db.from("automation_runs").update({ status: i.status, output: i.output as never, error: i.error ?? null, finished_at: new Date().toISOString() })
        .eq("workflow", i.workflow).eq("external_run_id", i.key), "run finish");
      return {};
    },
  ),

  /** Error workflow: marks the failed execution's run and alerts the admin. run.start stores the n8n execution id. */
  "run.fail": action(
    z.object({ execution_id: z.string().min(1).max(100), workflow_name: z.string().max(200), node: z.string().max(200).optional(), error: z.string().max(4000), url: z.string().max(500).optional() }).strict(),
    async (db, i) => {
      const r = must(await db.from("automation_runs").update({ status: "failed", error: `${i.node ? `[${i.node}] ` : ""}${i.error}`.slice(0, 4000), finished_at: new Date().toISOString() })
        .eq("status", "running").eq("input->>execution_id", i.execution_id).select("id, workflow, external_run_id"), "run fail");
      await sendEmail(`[Automation] Workflow failed: ${i.workflow_name}`, {
        Node: i.node ?? "—", Error: i.error, Execution: i.url ?? i.execution_id,
        Run: r.map((x) => `${x.workflow} / ${x.external_run_id}`).join(", ") || "not logged",
        Recovery: "Fix the cause, then n8n → Executions → Retry (every step is safe to repeat). See n8n/README.md, Failure recovery.",
      });
      return { runs: r.length };
    },
  ),

  /** Workflow A: email verification (Reoon, paid, off by default) → rescore → CRM update. Returns a PII-light summary. */
  "lead.enrich": action(z.object({ lead_id: id }).strict(), async (db, i) => {
    const lead = must(await db.from("leads").select("id, workspace_id, name, source, score, qualification, contact_id, company").eq("id", i.lead_id).single(), "lead");
    const contact = lead.contact_id ? must(await db.from("contacts").select("id, email, email_status").eq("id", lead.contact_id).single(), "contact") : null;
    let { score, qualification } = lead;
    let status: string | null = null;
    if (contact?.email && contact.email_status === "unverified") status = await verifyEmail(contact.email);
    if (contact && status) {
      must(await db.from("contacts").update({ email_status: status, email_verified_at: new Date().toISOString() }).eq("id", contact.id), "contact update");
      if (status === "invalid") {
        score = Math.max(0, score - 30);
        qualification = "unqualified";
        must(await db.from("lead_scores").insert({ workspace_id: lead.workspace_id, lead_id: lead.id, score, factors: [{ factor: "Email failed verification", points: -30 }], model: "rules-v1+reoon" }), "score");
        must(await db.from("leads").update({ score, qualification, last_activity_at: new Date().toISOString() }).eq("id", lead.id), "lead update");
      }
      must(await db.from("lead_activities").insert({ workspace_id: lead.workspace_id, lead_id: lead.id, kind: "system", body: `Email verification: ${status}`, meta: { provider: "reoon" } }), "activity");
    }
    return {
      lead_id: lead.id, name: lead.name, company: lead.company, source: lead.source, score, qualification,
      contact_id: lead.contact_id, email_status: status ?? contact?.email_status ?? "unknown",
      verification: status ? "done" : reoonEnabled() ? "skipped" : "disabled",
    };
  }),

  "notify.admin": action(
    z.object({ subject: z.string().min(1).max(150), fields: z.record(z.string().max(2000)).default({}) }).strict(),
    async (_db, i) => {
      await sendEmail(`[Automation] ${i.subject}`, i.fields);
      return {};
    },
  ),

  /** Workflows A and C: one pending-approval draft per contact + purpose, only for eligible contacts. Never sends. */
  "outreach.draft": action(
    z.object({ contact_id: id, lead_id: id.nullable().default(null), purpose: z.enum(["reply", "outreach"]) }).strict(),
    async (db, i) => {
      const open = must(await db.from("outreach_drafts").select("id").eq("contact_id", i.contact_id).eq("purpose", i.purpose).is("followup_of", null).in("status", OPEN).limit(1), "open drafts");
      if (open.length) return { created: false, draft_id: open[0].id, reason: "An open draft already exists" };
      const elig = must(await db.rpc("contact_outreach_eligibility", { p_contact: i.contact_id, p_purpose: i.purpose }), "eligibility") as { eligible: boolean; reasons: string[] };
      if (!elig.eligible) return { created: false, reasons: elig.reasons };
      const c = must(await db.from("contacts").select("workspace_id, full_name, companies(name)").eq("id", i.contact_id).single(), "contact");
      const lead = i.lead_id ? must(await db.from("leads").select("source").eq("id", i.lead_id).single(), "lead") : null;
      const company = (c.companies as { name: string } | null)?.name ?? null;
      const text = i.purpose === "reply" ? replyDraft(c.full_name, lead?.source ?? "contact") : outreachDraft(c.full_name, company);
      const row = must(await db.from("outreach_drafts").insert({ workspace_id: c.workspace_id, contact_id: i.contact_id, lead_id: i.lead_id, purpose: i.purpose, status: "pending_approval", ...text }).select("id").single(), "draft insert");
      return { created: true, draft_id: row.id };
    },
  ),

  /** Workflow B: analyse a batch of the job's new prospects (approved sources only), leaving them in the review queue. */
  "discovery.analyze": action(z.object({ job_id: id, limit: z.number().int().min(1).max(10).default(5) }).strict(), async (db, i) => {
    const job = must(await db.from("discovery_jobs").select("id, workspace_id, source, status").eq("id", i.job_id).single(), "job");
    if (job.status !== "completed" || !["csv_upload", "api"].includes(job.source)) return { analyzed: 0, failed: 0, remaining: 0, reason: `Job is ${job.status} / ${job.source}` };
    const batch = must(await db.from("prospects").select("id").eq("discovery_job_id", job.id).eq("research_status", "new").not("website", "is", null).limit(i.limit), "prospects");
    let analyzed = 0, failed = 0;
    for (const p of batch) {
      try { await analyzeProspect(db, job.workspace_id, p.id); analyzed++; } catch (e) { failed++; console.error("[automation] analyze", p.id, e instanceof Error ? e.message : e); }
    }
    const left = await db.from("prospects").select("id", { count: "exact", head: true }).eq("discovery_job_id", job.id).eq("research_status", "new").not("website", "is", null);
    const pending = await db.from("prospects").select("id", { count: "exact", head: true }).eq("discovery_job_id", job.id).eq("review_status", "pending");
    return { analyzed, failed, remaining: left.count ?? 0, pending_review: pending.count ?? 0 };
  }),

  /** Workflow D step 1: everything re-checked at send time. Disabled → the request is cancelled, nothing is sent. */
  "outreach.claim_send": action(z.object({ send_id: id }).strict(), async (db, i) => {
    if (!sendingEnabled()) {
      must(await db.from("outreach_sends").update({ status: "cancelled", error: "Sending is disabled (OUTREACH_SENDING_ENABLED is not true)" }).eq("id", i.send_id).eq("status", "queued"), "cancel");
      return { ok: false, reason: "sending_disabled" };
    }
    return must(await db.rpc("outreach_claim_send", { p_send: i.send_id, p_daily_limit: dailyLimit() }), "claim") as Record<string, unknown>;
  }),

  /** Workflow D step 2: provider message id + delivery status. */
  "outreach.record_send": action(
    z.object({ send_id: id, status: z.enum(["sent", "failed"]), message_id: z.string().max(300).optional(), error: z.string().max(2000).optional() }).strict(),
    async (db, i) => must(await db.rpc("outreach_record_send", { p_send: i.send_id, p_status: i.status, p_message_id: i.message_id ?? "", p_error: i.error ?? "" }), "record") as Record<string, unknown>,
  ),

  /** Workflow E: follow-up drafts for unanswered sends. Drafts only; each still needs approval and a Send click. */
  "followups.prepare": action(z.object({ days: z.number().int().min(7).max(60).default(7), limit: z.number().int().min(1).max(50).default(20) }).strict(), async (db, i) => {
    const due = must(await db.rpc("outreach_followups_due", { p_days: i.days, p_limit: i.limit }), "due");
    const ids: string[] = [];
    let skipped = 0;
    for (const d of due ?? []) {
      const elig = must(await db.rpc("contact_outreach_eligibility", { p_contact: d.contact_id, p_purpose: d.purpose }), "eligibility") as { eligible: boolean };
      // A follow-up is due a week after the send, the same window as the cool-down, so only suppression/consent can block it.
      if (!elig.eligible) { skipped++; continue; }
      const c = must(await db.from("contacts").select("full_name").eq("id", d.contact_id).single(), "contact");
      const row = await db.from("outreach_drafts").insert({
        workspace_id: d.workspace_id, contact_id: d.contact_id, lead_id: d.lead_id, purpose: d.purpose, followup_of: d.draft_id, status: "pending_approval", ...followupDraft(c.full_name, d.subject),
      }).select("id").single();
      if (row.error?.code === "23505") { skipped++; continue; }
      ids.push(must(row, "follow-up insert").id);
    }
    return { prepared: ids.length, skipped, draft_ids: ids };
  }),

  /** Ops: the n8n pump calls this every minute. Also prunes n8n request nonces older than a day. */
  "outbox.dispatch": action(z.object({ limit: z.number().int().min(1).max(25).default(10) }).strict(), async (db, i) => {
    await db.from("webhook_events").delete().eq("provider", "n8n").lt("received_at", new Date(Date.now() - 86_400_000).toISOString());
    return { ...(await dispatchOutbox(i.limit)) };
  }),
} as const;

export type ActionName = keyof typeof ACTIONS;
