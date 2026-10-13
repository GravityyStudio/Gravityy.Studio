import type { SupabaseClient } from "@supabase/supabase-js";

type Actor = { id: string; email?: string | null } | null;

/**
 * Append-only audit trail. Admin sessions insert as themselves (RLS: actor_id = auth.uid());
 * system events (webhooks, public forms) pass the service-role client and a null actor.
 * Never throws: a failed log line must not undo the action it describes.
 */
export async function audit(sb: SupabaseClient, actor: Actor, action: string, entity: string, entityId?: string | null, meta: Record<string, unknown> = {}) {
  const { error } = await sb.from("audit_log").insert({ actor_id: actor?.id ?? null, actor_email: actor?.email ?? null, action, entity, entity_id: entityId ?? null, meta });
  if (error) console.error("[audit]", error.message);
}
