import type { SupabaseClient } from "@supabase/supabase-js";
import { requireAdmin } from "@/lib/auth";
import { RESOURCES, type Kind } from "@/lib/resources";
import type { Options, Row } from "./RecordDialog";
import RecordsView from "./RecordsView";
import LeadsBoard from "./LeadsBoard";

/** Client + plan pickers for the record drawer. */
export async function loadOptions(sb: SupabaseClient): Promise<Options> {
  const [{ data: clients }, { data: plans }] = await Promise.all([
    sb.from("profiles").select("id, email, full_name").order("email").returns<{ id: string; email: string; full_name: string }[]>(),
    sb.from("plans").select("id, name, region").order("sort").returns<{ id: string; name: string; region: string }[]>(),
  ]);
  return {
    clients: (clients ?? []).map((c) => ({ id: c.id, label: c.full_name ? `${c.full_name} (${c.email})` : c.email })),
    plans: (plans ?? []).map((p) => ({ id: p.id, label: `${p.name} · ${p.region}` })),
  };
}

export async function loadRows(sb: SupabaseClient, kind: Kind, clientId?: string) {
  const [col, asc] = RESOURCES[kind].order;
  let q = sb.from(kind).select("*").order(col, { ascending: asc }).limit(500);
  if (clientId) q = q.eq("client_id", clientId);
  return ((await q).data ?? []) as Row[];
}

/** Server page body for one admin resource (RLS: admin reads every row). */
export default async function ResourcePage({ kind, intro }: { kind: Kind; intro?: string }) {
  const { supabase } = await requireAdmin();
  const [rows, options] = await Promise.all([loadRows(supabase, kind), loadOptions(supabase)]);
  return (
    <div>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">{RESOURCES[kind].title}</h2>
      {intro && <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">{intro}</p>}
      <div className="mt-6">{kind === "leads" ? <LeadsBoard rows={rows} options={options} /> : <RecordsView kind={kind} rows={rows} options={options} />}</div>
    </div>
  );
}
