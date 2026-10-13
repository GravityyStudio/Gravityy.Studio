import { Check, FolderKanban } from "lucide-react";
import Button from "@/components/ui/Button";
import { requireUser } from "@/lib/auth";
import { human, type Milestone } from "@/lib/resources";
import { badge, shortDate } from "../../TicketList";

export const metadata = { title: "Projects" };

type Project = { id: string; name: string; status: string; progress: number; due_date: string | null; description: string | null; milestones: Milestone[] };

/** Client's projects with milestone tracking (milestones are maintained by the studio on the project record). */
export default async function PortalProjects() {
  const { supabase } = await requireUser("/portal/projects");
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name, status, progress, due_date, description, milestones")
    .order("updated_at", { ascending: false })
    .returns<Project[]>();

  if (!projects?.length)
    return (
      <div className="card flex flex-col items-center gap-4 px-6 py-16 text-center">
        <FolderKanban size={24} aria-hidden="true" className="text-muted" />
        <p className="max-w-[420px] text-muted">No projects yet. Once work starts, its milestones and progress show up here.</p>
        <Button href="/portal/requests#new" variant="accent">
          Request work
        </Button>
      </div>
    );

  return (
    <ul className="flex flex-col gap-5">
      {projects.map((p) => {
        const ms = Array.isArray(p.milestones) ? p.milestones : [];
        const done = ms.filter((m) => m.done).length;
        const next = ms.findIndex((m) => !m.done);
        return (
          <li key={p.id} className="card flex flex-col gap-5 p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-medium tracking-[-0.03em]">{p.name}</h2>
                {p.due_date && <p className="mt-1 text-sm text-muted">Due {shortDate(p.due_date)}</p>}
              </div>
              <span className={`${badge} ${p.status === "delivered" ? "border-accent/50 text-accent" : ""}`}>{human(p.status)}</span>
            </div>
            {p.description && <p className="max-w-[720px] text-[15px] leading-relaxed text-muted">{p.description}</p>}
            <div className="flex items-center gap-3 text-sm">
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={p.progress} aria-valuemin={0} aria-valuemax={100} aria-label={`${p.name} progress`}>
                <span className="block h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
              </span>
              <span className="tabular-nums">{p.progress}%</span>
            </div>
            {ms.length > 0 && (
              <div>
                <h3 className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  Milestones · {done}/{ms.length} done
                </h3>
                <ol className="relative flex flex-col gap-0 border-l border-line pl-6">
                  {ms.map((m, i) => (
                    <li key={i} className="relative pb-4 last:pb-0">
                      <span
                        aria-hidden="true"
                        className={`absolute -left-[33px] top-0.5 grid h-[18px] w-[18px] place-items-center rounded-full border ${m.done ? "border-accent bg-accent text-bg" : i === next ? "border-accent bg-bg" : "border-line-strong bg-bg"}`}
                      >
                        {m.done && <Check size={11} strokeWidth={3} />}
                      </span>
                      <p className={`text-[15px] ${m.done ? "text-muted line-through decoration-fg/30" : i === next ? "font-medium" : ""}`}>
                        {m.title}
                        <span className="sr-only">{m.done ? " (done)" : i === next ? " (in progress)" : " (upcoming)"}</span>
                      </p>
                      {m.due && <p className="text-[13px] text-muted">{shortDate(m.due)}</p>}
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
