import { NextResponse } from "next/server";
import { z } from "zod";
import { verifyStripeSignature } from "@/lib/webhook-verify";
import { createSupabaseService } from "@/lib/supabase/service";
import { ACTIONS, type ActionName } from "@/lib/automation/actions";

export const dynamic = "force-dynamic";

const json = (status: number, body: Record<string, unknown>) => NextResponse.json(body, { status });

/**
 * Signed callbacks from n8n. Auth: `X-Gravityy-Signature: t=<unix>,v1=<hex HMAC-SHA256(N8N_CALLBACK_SECRET, "t.body")>`,
 * rejected after 5 minutes. Replay: `X-Request-Id` (uuid) is single-use (webhook_events, provider 'n8n').
 */
export async function POST(req: Request, { params }: { params: Promise<{ action: string }> }) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret) return json(503, { error: "Automation is not configured" });
  const raw = await req.text();
  if (raw.length > 64_000) return json(413, { error: "Payload too large" });
  if (!verifyStripeSignature(raw, req.headers.get("x-gravityy-signature"), secret)) return json(401, { error: "Bad signature" });

  const { action } = await params;
  const handler = Object.hasOwn(ACTIONS, action) ? ACTIONS[action as ActionName] : null;
  if (!handler) return json(404, { error: `Unknown action ${action}` });
  const requestId = z.string().uuid().safeParse(req.headers.get("x-request-id"));
  if (!requestId.success) return json(400, { error: "X-Request-Id must be a uuid" });

  let body: unknown;
  try {
    body = JSON.parse(raw || "{}");
  } catch {
    return json(400, { error: "Invalid JSON" });
  }
  const input = handler.schema.safeParse(body);
  if (!input.success) return json(422, { error: "Invalid input", issues: input.error.issues.slice(0, 5) });

  const db = createSupabaseService();
  const { error: replay } = await db.from("webhook_events").insert({ provider: "n8n", event_id: requestId.data });
  if (replay) return replay.code === "23505" ? json(409, { error: "Replayed request" }) : json(500, { error: "Could not record request" });

  try {
    // Each schema/handler pair is defined together, so the parsed input always matches its handler.
    const out = await (handler.run as (db: unknown, i: unknown) => Promise<Record<string, unknown>>)(db, input.data);
    return json(200, { ok: true, ...out });
  } catch (e) {
    console.error(`[automation] ${action} failed:`, e);
    return json(500, { error: e instanceof Error ? e.message : "Action failed" });
  }
}
