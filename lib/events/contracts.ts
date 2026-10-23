import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { createSupabaseService } from "@/lib/supabase/service";
import type { Json } from "@/lib/supabase/database.types";

// n8n event contracts (v1). Every event is written to public.outbox_events with topic = type and this envelope
// as payload; n8n consumes them (phase 5: signed delivery). Payloads carry IDs and counts, never personal data:
// workflows fetch details through the API with their own credentials.
//
// Compatibility: additive changes keep version 1; renaming/removing a field bumps the version.

const id = z.string().uuid();
const envelope = <T extends string, D extends z.ZodTypeAny>(type: T, data: D) =>
  z.object({ id, type: z.literal(type), version: z.literal(1), occurred_at: z.string().datetime({ offset: true }), workspace_id: id, data }).strict();

export const discoveryCompleted = envelope(
  "discovery.completed",
  z.object({
    job_id: id,
    source: z.enum(["csv_upload", "api"]),
    provider: z.string().min(1).max(60),
    status: z.enum(["completed", "failed"]),
    found: z.number().int().min(0),
    imported: z.number().int().min(0),
    duplicates: z.number().int().min(0),
    rejected: z.number().int().min(0),
  }).strict(),
);

export const websiteAnalyzed = envelope(
  "website.analyzed",
  z.object({
    prospect_id: id,
    analysis_id: id,
    status: z.enum(["ok", "blocked", "robots_disallowed", "not_html", "error"]),
    confirmed_count: z.number().int().min(0),
    inferred_count: z.number().int().min(0),
    high_severity_count: z.number().int().min(0),
  }).strict(),
);

export const leadScored = envelope(
  "lead.scored",
  z.object({
    prospect_id: id,
    score: z.number().int().min(0).max(100),
    qualified: z.boolean(),
    confidence: z.enum(["high", "medium", "low"]),
    model: z.string().min(1).max(40),
    components: z.array(z.object({ key: z.string(), points: z.number().min(0), max: z.number().min(0), known: z.boolean() }).strict()).length(4),
  }).strict(),
);

// Emitted inside the database by public.prospect_add_to_crm() (same shape).
export const crmUpdated = envelope(
  "crm.updated",
  z.object({ action: z.literal("prospect_added"), prospect_id: id, company_id: id, lead_id: id }).strict(),
);

export const EVENTS = {
  "discovery.completed": discoveryCompleted,
  "website.analyzed": websiteAnalyzed,
  "lead.scored": leadScored,
  "crm.updated": crmUpdated,
} as const;
export type EventType = keyof typeof EVENTS;
export type EventOf<T extends EventType> = z.infer<(typeof EVENTS)[T]>;

/** Builds and validates an envelope; throws if `data` breaks the contract (a bug, never user input). */
export function buildEvent<T extends EventType>(type: T, workspaceId: string, data: EventOf<T>["data"], now = new Date()): EventOf<T> {
  return EVENTS[type].parse({ id: randomUUID(), type, version: 1, occurred_at: now.toISOString(), workspace_id: workspaceId, data }) as EventOf<T>;
}

/** Validates and writes an event to the outbox (service-role client). Failures are logged, never thrown:
 * the business action already happened and must not be rolled back by a notification problem. */
export async function emitEvent<T extends EventType>(db: ReturnType<typeof createSupabaseService>, type: T, workspaceId: string, data: EventOf<T>["data"], aggregateId: string | null = null) {
  try {
    const payload = buildEvent(type, workspaceId, data);
    const { error } = await db.from("outbox_events").insert({ workspace_id: workspaceId, topic: type, aggregate_id: aggregateId, payload: payload as unknown as Json });
    if (error) throw new Error(error.message);
  } catch (e) {
    console.error(`[events] ${type} not queued:`, e instanceof Error ? e.message : e);
  }
}
