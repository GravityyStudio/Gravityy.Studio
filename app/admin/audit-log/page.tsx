import DataTable from "@/components/app/DataTable";
import { requireAdmin } from "@/lib/auth";
import { human } from "@/lib/resources";

export const metadata = { title: "Audit log" };

type Row = { id: number; actor_email: string | null; action: string; entity: string; entity_id: string | null; meta: Record<string, unknown>; created_at: string };

/** Append-only (no update/delete policies). Admin actions log as the admin; webhooks and site forms log as System. */
export default async function AuditLog() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("audit_log").select("*").order("created_at", { ascending: false }).limit(300).returns<Row[]>();
  return (
    <div>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">Audit log</h2>
      <p className="mb-6 mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">The latest 300 changes across the admin, payments and site forms.</p>
      <DataTable head={["When", "Who", "Action", "Entity", "Details"]} empty={!data?.length && <p className="px-6 py-14 text-center text-sm text-muted">Nothing logged yet.</p>}>
        {data?.map((a) => (
          <tr key={a.id} className="align-top">
            <td className="whitespace-nowrap px-5 py-3 text-muted">{new Date(a.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</td>
            <td className="max-w-[200px] truncate px-5 py-3">{a.actor_email ?? "System"}</td>
            <td className="px-5 py-3 font-medium">{human(a.action)}</td>
            <td className="px-5 py-3">
              {a.entity}
              {a.entity_id && <span className="block max-w-[220px] truncate font-mono text-[11px] text-muted">{a.entity_id}</span>}
            </td>
            <td className="max-w-[320px] px-5 py-3">
              {Object.keys(a.meta ?? {}).length > 0 && <code className="line-clamp-2 break-all font-mono text-[12px] text-muted">{JSON.stringify(a.meta)}</code>}
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
