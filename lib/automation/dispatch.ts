import { createSupabaseService } from "@/lib/supabase/service";
import { toEnvelope } from "@/lib/events/contracts";
import { signPayload } from "@/lib/webhook-verify";
import { sendEmail } from "@/lib/email";

// Outbox → n8n. Each due event is claimed with a lease (outbox_claim), POSTed signed to the workflow's webhook,
// then marked delivered / failed (backoff) / dead (after 8 attempts) by outbox_complete. Delivery is at-least-once:
// workflows dedupe on the envelope id (run.start), so a repeat after a lost response is harmless.

/** Topic → n8n webhook path. Topics without a consumer are acknowledged without sending. */
export const ROUTES: Partial<Record<string, string>> = {
  "lead.created": "gravityy-inbound-lead",
  "discovery.completed": "gravityy-outbound-research",
  "outreach.draft_requested": "gravityy-outreach-draft",
  "outreach.send_requested": "gravityy-gmail-send",
};

export type DispatchResult = { configured: boolean; claimed: number; delivered: number; failed: number; dead: number };

export async function dispatchOutbox(limit = 10): Promise<DispatchResult> {
  const base = process.env.N8N_WEBHOOK_BASE_URL?.replace(/\/+$/, "");
  const secret = process.env.N8N_OUTBOUND_SECRET;
  const result: DispatchResult = { configured: Boolean(base && secret), claimed: 0, delivered: 0, failed: 0, dead: 0 };
  if (!base || !secret) return result;   // not configured: events wait in the outbox

  const db = createSupabaseService();
  const { data: rows, error } = await db.rpc("outbox_claim", { p_limit: limit, p_lease_seconds: 120 });
  if (error) throw new Error(`outbox_claim: ${error.message}`);
  result.claimed = rows?.length ?? 0;

  for (const row of rows ?? []) {
    let failure: string | null = null;
    const path = ROUTES[row.topic];
    if (path) {
      const env = toEnvelope(row);
      if ("error" in env) failure = env.error;
      else {
        const body = JSON.stringify(env.event);
        try {
          const res = await fetch(`${base}/${path}`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "X-Gravityy-Signature": signPayload(body, secret), "X-Gravityy-Event-Id": env.event.id },
            body,
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) failure = `n8n responded ${res.status}`;
        } catch (e) {
          failure = e instanceof Error ? e.message : "Request failed";
        }
      }
    }
    const { data: status, error: completeError } = await db.rpc("outbox_complete", { p_id: row.id, p_ok: failure === null, p_error: failure ?? "" });
    if (completeError) console.error("[outbox] complete failed:", completeError.message);
    if (status === "delivered") result.delivered++;
    else if (status === "dead") {
      result.dead++;
      await sendEmail(`Automation: event moved to dead letter (${row.topic})`, {
        Event: row.id, Topic: row.topic, Attempts: String(row.attempts), Error: failure ?? "", Fix: "Admin → Outreach & automation → Dead letters → Requeue",
      }).catch((e) => console.error("[outbox] dead-letter notice failed:", e));
    } else result.failed++;
  }
  return result;
}
