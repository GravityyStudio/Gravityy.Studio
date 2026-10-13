import Link from "@/components/ui/SmartLink";
import { DataTable } from "./AppShell";
import { formatMinor } from "@/lib/billing";

export type InvoiceRow = { id: string; number: number; email: string | null; plan_id: string | null; provider: string; currency: string; total_minor: number; status: string; created_at: string };

/** Admin invoice list (all clients via admin RLS). */
export default function InvoiceTable({ rows }: { rows: InvoiceRow[] }) {
  return (
    <DataTable head={["Invoice", "Client", "Plan", "Provider", "Total", "Date"]} empty={!rows.length && <p className="px-6 py-14 text-center text-sm text-muted">No invoices yet.</p>}>
      {rows.map((i) => (
        <tr key={i.id} className="transition-colors hover:bg-raised/60">
          <td className="px-5 py-4">
            <Link href={`/portal/invoices/${i.id}`} className="font-mono hover:text-accent">
              #{i.number}
            </Link>
          </td>
          <td className="max-w-[220px] truncate px-5 py-4">{i.email ?? "—"}</td>
          <td className="px-5 py-4 text-muted">{i.plan_id}</td>
          <td className="px-5 py-4 capitalize text-muted">{i.provider}</td>
          <td className="px-5 py-4 tabular-nums">{formatMinor(i.total_minor, i.currency)}</td>
          <td className="px-5 py-4 text-muted">{new Date(i.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
        </tr>
      ))}
    </DataTable>
  );
}
