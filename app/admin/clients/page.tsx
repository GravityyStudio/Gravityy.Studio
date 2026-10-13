import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import DataTable from "@/components/app/DataTable";
import { requireAdmin, type Profile } from "@/lib/auth";
import RoleSelect from "./RoleSelect";

export const metadata = { title: "Clients" };

type Ref = { client_id: string | null; status: string };

/** Everyone with an account (sign-up creates the profile). Counts come from the client-linked tables. */
export default async function AdminClients() {
  const { supabase, user } = await requireAdmin();
  const [{ data: people }, { data: projects }, { data: subs }, { data: tickets }] = await Promise.all([
    supabase.from("profiles").select("*").order("created_at", { ascending: false }).returns<Profile[]>(),
    supabase.from("projects").select("client_id, status").returns<Ref[]>(),
    supabase.from("subscriptions").select("client_id, status").returns<Ref[]>(),
    supabase.from("tickets").select("client_id, status").returns<Ref[]>(),
  ]);
  const count = (rows: Ref[] | null, id: string, ok: (s: string) => boolean) => (rows ?? []).filter((r) => r.client_id === id && ok(r.status)).length;

  return (
    <div>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">Clients</h2>
      <p className="mb-6 mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">Accounts are created when someone signs up at /login. Open a client to manage their projects, subscriptions and tickets.</p>
      <DataTable head={["Name", "Email", "Region", "Projects", "Active subs", "Open tickets", "Role", ""]} empty={!people?.length && <p className="px-6 py-14 text-center text-sm text-muted">No accounts yet.</p>}>
        {people?.map((p) => (
          <tr key={p.id} className="transition-colors hover:bg-raised/60">
            <td className="px-5 py-3 font-medium">{p.full_name || "—"}</td>
            <td className="max-w-[240px] truncate px-5 py-3">{p.email}</td>
            <td className="px-5 py-3 text-muted">{p.region}</td>
            <td className="px-5 py-3 tabular-nums">{count(projects, p.id, (s) => s !== "delivered")}</td>
            <td className="px-5 py-3 tabular-nums">{count(subs, p.id, (s) => s === "active")}</td>
            <td className="px-5 py-3 tabular-nums">{count(tickets, p.id, (s) => s === "open" || s === "in_progress")}</td>
            <td className="px-5 py-3">
              <RoleSelect userId={p.id} role={p.role} self={p.id === user.id} />
            </td>
            <td className="px-5 py-3 text-right">
              <Link href={`/admin/clients/${p.id}`} className="inline-flex min-h-[40px] items-center gap-1 font-medium hover:text-accent">
                Open <ArrowUpRight size={14} aria-hidden="true" />
              </Link>
            </td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
