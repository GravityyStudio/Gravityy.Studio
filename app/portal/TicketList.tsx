import type { SupabaseClient } from "@supabase/supabase-js";
import { human } from "@/lib/resources";
import TicketForm from "./TicketForm";

type Ticket = { id: string; subject: string; body: string | null; priority: string; status: string; response: string | null; created_at: string };

export const badge = "whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] text-fg/80";
export const shortDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" });

/** List + form for one ticket kind (RLS: own tickets only). Shared by Service requests and Support tickets. */
export default async function TicketList({ supabase, kind, title, empty, services }: { supabase: SupabaseClient; kind: "support" | "request"; title: string; empty: string; services?: string[] }) {
  const { data: tickets } = await supabase
    .from("tickets")
    .select("id, subject, body, priority, status, response, created_at")
    .eq("kind", kind)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Ticket[]>();

  return (
    <div className="grid gap-14 xl:grid-cols-[1.3fr_1fr] xl:gap-5">
      <section aria-labelledby="list-h" className="min-w-0">
        <h2 id="list-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          {title}
        </h2>
        <ul className="flex flex-col gap-3">
          {tickets?.map((t) => (
            <li key={t.id} className="card flex flex-col gap-2 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-medium">{t.subject}</h3>
                <span className={`${badge} ${t.status === "resolved" ? "border-accent/50 text-accent" : ""}`}>{human(t.status)}</span>
              </div>
              <p className="text-[13px] text-muted">
                {human(t.priority)} priority · {shortDate(t.created_at)}
              </p>
              {t.body && <p className="whitespace-pre-line text-[15px] leading-relaxed text-fg/80">{t.body}</p>}
              {t.response && (
                <div className="mt-1 rounded-2xl border border-accent/30 bg-hi p-4">
                  <p className="mb-1 font-mono text-[11px] uppercase tracking-[0.12em] text-accent">Gravityy</p>
                  <p className="whitespace-pre-line text-[15px] leading-relaxed">{t.response}</p>
                </div>
              )}
            </li>
          ))}
          {!tickets?.length && <li className="card p-6 text-sm text-muted">{empty}</li>}
        </ul>
      </section>
      <section id="new" aria-labelledby="new-h" className="card h-fit scroll-mt-28 p-6 sm:p-8">
        <h2 id="new-h" className="mb-5 text-2xl font-medium tracking-[-0.03em]">
          {kind === "request" ? "New service request" : "Get support"}
        </h2>
        <TicketForm kind={kind} services={services} />
      </section>
    </div>
  );
}
