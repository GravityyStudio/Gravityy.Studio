import { ArrowUpRight, Receipt } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import DataTable from "@/components/app/DataTable";
import { requireUser } from "@/lib/auth";
import { formatMinor } from "@/lib/billing";

export const metadata = { title: "Invoices" };

type Row = { id: string; number: number; plan_id: string | null; provider: string; currency: string; total_minor: number; status: string; created_at: string };

export default async function PortalInvoices() {
  const { supabase } = await requireUser("/portal/invoices");
  const [{ data: invoices }, { data: plans }] = await Promise.all([
    supabase.from("invoices").select("id, number, plan_id, provider, currency, total_minor, status, created_at").order("created_at", { ascending: false }).returns<Row[]>(),
    supabase.from("plans").select("id, name").returns<{ id: string; name: string }[]>(),
  ]);
  return (
    <DataTable
      head={["Invoice", "Plan", "Date", "Paid via", "Total", ""]}
      empty={
        !invoices?.length && (
          <div className="flex flex-col items-center gap-3 px-6 py-14 text-center text-sm text-muted">
            <Receipt size={22} aria-hidden="true" />
            No invoices yet. When you buy a plan, the invoice lands here automatically.
          </div>
        )
      }
    >
      {invoices?.map((i) => (
        <tr key={i.id} className="transition-colors hover:bg-raised/60">
          <td className="px-5 py-4 font-mono">#{i.number}</td>
          <td className="px-5 py-4">{plans?.find((p) => p.id === i.plan_id)?.name ?? i.plan_id}</td>
          <td className="px-5 py-4 text-muted">{new Date(i.created_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</td>
          <td className="px-5 py-4 capitalize text-muted">{i.provider}</td>
          <td className="px-5 py-4 tabular-nums">{formatMinor(i.total_minor, i.currency)}</td>
          <td className="px-5 py-4 text-right">
            <Link href={`/portal/invoices/${i.id}`} className="inline-flex min-h-[40px] items-center gap-1 font-medium hover:text-accent">
              View <ArrowUpRight size={14} aria-hidden="true" />
            </Link>
          </td>
        </tr>
      ))}
    </DataTable>
  );
}
