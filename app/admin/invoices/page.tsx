import { requireAdmin } from "@/lib/auth";
import InvoiceTable from "@/components/app/InvoiceTable";

export const metadata = { title: "Invoices" };

export default async function AdminInvoices() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase
    .from("invoices")
    .select("id, number, email, plan_id, provider, currency, total_minor, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);
  return <InvoiceTable rows={data ?? []} />;
}
