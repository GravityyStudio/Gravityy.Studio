"use client";
import { useCallback, useOptimistic, useState, useTransition } from "react";
import { GripVertical, Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import { moveLead } from "@/app/admin/records";
import { formatMinor } from "@/lib/billing";
import { STAGES, human } from "@/lib/resources";
import RecordDialog, { type Options, type Row } from "./RecordDialog";

const total = (rows: Row[]) =>
  Object.entries(rows.reduce<Record<string, number>>((m, r) => ((m[String(r.currency)] = (m[String(r.currency)] ?? 0) + Number(r.value_minor ?? 0)), m), {}))
    .filter(([, v]) => v)
    .map(([c, v]) => formatMinor(v, c))
    .join(" + ") || "—";

/**
 * Pipeline kanban. Drag a card between columns (HTML5 DnD) or use its stage select (keyboard / touch).
 * Moves are optimistic; the server revalidates, and a failed move snaps back.
 */
export default function LeadsBoard({ rows: initial, options }: { rows: Row[]; options: Options }) {
  const [rows, optimistic] = useOptimistic(initial, (rs: Row[], m: { id: string; stage: string }) => rs.map((r) => (r.id === m.id ? { ...r, stage: m.stage } : r)));
  const [, start] = useTransition();
  const [open, setOpen] = useState<Row | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [error, setError] = useState("");
  const close = useCallback(() => setOpen(null), []);

  const move = (id: string, stage: string) =>
    start(async () => {
      optimistic({ id, stage });
      setError((await moveLead(id, stage)).error ?? "");
    });

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {rows.length} leads · open pipeline <span className="text-fg tabular-nums">{total(rows.filter((r) => r.stage !== "won" && r.stage !== "lost"))}</span>
        </p>
        <Button variant="accent" onClick={() => setOpen({ stage: "new", source: "website", currency: "INR" })}>
          <Plus size={16} aria-hidden="true" /> New lead
        </Button>
      </div>
      <p role="status" className="mb-3 min-h-5 text-sm text-danger">
        {error}
      </p>
      <div className="-mx-4 overflow-x-auto px-4 pb-4 sm:mx-0 sm:px-0" data-lenis-prevent>
        <div className="grid auto-cols-[minmax(250px,1fr)] grid-flow-col gap-3">
          {STAGES.map((stage) => {
            const items = rows.filter((r) => r.stage === stage);
            return (
              <section
                key={stage}
                aria-labelledby={`col-${stage}`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOver(stage);
                }}
                onDragLeave={() => setOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setOver(null);
                  const id = e.dataTransfer.getData("text/plain");
                  if (id && rows.find((r) => r.id === id)?.stage !== stage) move(id, stage);
                }}
                className={`flex min-h-[360px] flex-col gap-3 rounded-card border p-3 transition-colors duration-200 ${over === stage ? "border-accent/60 bg-hi" : "border-line bg-surface-2"}`}
              >
                <h2 id={`col-${stage}`} className="flex items-center justify-between gap-2 px-2 pt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                  <span className={stage === "won" ? "text-accent" : ""}>{human(stage)}</span>
                  <span className="tabular-nums">
                    {items.length} · {total(items)}
                  </span>
                </h2>
                <ul className="flex flex-col gap-2">
                  {items.map((l) => (
                    <li
                      key={l.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/plain", String(l.id));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      className="group cursor-grab rounded-2xl border border-line bg-bg p-4 transition-colors hover:border-line-strong active:cursor-grabbing"
                    >
                      <div className="flex items-start gap-2">
                        <GripVertical size={14} aria-hidden="true" className="mt-1 shrink-0 text-muted opacity-50 group-hover:opacity-100" />
                        <div className="min-w-0 flex-1">
                          <button onClick={() => setOpen(l)} className="block max-w-full truncate text-left font-medium transition-colors hover:text-accent">
                            {String(l.name)}
                          </button>
                          <p className="truncate text-[13px] text-muted">{String(l.company || l.email || human(String(l.source)))}</p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2">
                        <span className="text-sm tabular-nums">{l.value_minor ? formatMinor(Number(l.value_minor), String(l.currency)) : "—"}</span>
                        <select
                          aria-label={`Stage for ${String(l.name)}`}
                          value={String(l.stage)}
                          onChange={(e) => move(String(l.id), e.target.value)}
                          className="min-h-[36px] rounded-full border border-line bg-bg px-2 text-[12px]"
                        >
                          {STAGES.map((s) => (
                            <option key={s} value={s}>
                              {human(s)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  ))}
                </ul>
                {!items.length && <p className="px-2 py-6 text-center text-[13px] text-muted">Drop a lead here</p>}
              </section>
            );
          })}
        </div>
      </div>
      <RecordDialog kind="leads" record={open} options={options} onClose={close} />
    </div>
  );
}
