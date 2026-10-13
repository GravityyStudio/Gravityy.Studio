"use client";
import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
import Button from "@/components/ui/Button";
import { deleteRecord, saveRecord } from "@/app/admin/records";
import type { Result } from "@/app/admin/actions";
import { formatMinor } from "@/lib/billing";
import { RESOURCES, formatMilestones, human, type Field, type Kind } from "@/lib/resources";

export type Row = Record<string, unknown> & { id?: string };
export type Options = { clients: { id: string; label: string }[]; plans: { id: string; label: string }[] };

const str = (v: unknown) => (v == null ? "" : String(v));

/** Table/card cell for a field value. Dates are formatted in UTC so server and client render the same text. */
export function display(f: Field, row: Row, o: Options): ReactNode {
  const v = row[f.name];
  if (f.type === "checkbox") return v ? "Yes" : "No";
  if (f.type === "milestones") return Array.isArray(v) && v.length ? `${v.filter((m) => m.done).length}/${v.length} done` : <span className="text-muted">—</span>;
  if (v == null || v === "") return <span className="text-muted">—</span>;
  if (f.type === "money") return <span className="tabular-nums">{formatMinor(Number(v), str(row.currency) || "INR")}</span>;
  if (f.type === "client") return o.clients.find((c) => c.id === v)?.label ?? "Unknown";
  if (f.type === "plan") return o.plans.find((p) => p.id === v)?.label ?? str(v);
  if (f.type === "date") return new Date(str(v)).toLocaleDateString("en-IN", { dateStyle: "medium", timeZone: "UTC" });
  if (f.name === "progress") return `${v}%`;
  if (f.type === "select")
    return <span className="whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em]">{human(str(v))}</span>;
  return str(v);
}

function Input({ f, value, o }: { f: Field; value: unknown; o: Options }) {
  if (f.type === "checkbox")
    return (
      <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" name={f.name} defaultChecked={Boolean(value)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
        {f.label}
      </label>
    );
  const base = { name: f.name, required: f.required, className: "field" };
  const list = f.type === "client" ? o.clients : f.type === "plan" ? o.plans : null;
  const el =
    f.type === "milestones" ? <textarea {...base} rows={6} defaultValue={formatMilestones(value)} className="field resize-y font-mono text-[14px]" />
    : f.type === "textarea" ? <textarea {...base} rows={f.name === "body" ? 14 : 4} maxLength={f.max} defaultValue={str(value)} className="field resize-y" />
    : f.type === "select" ? (
      <select {...base} defaultValue={str(value) || f.options?.[0]}>
        {f.options?.map((x) => <option key={x} value={x}>{human(x)}</option>)}
      </select>
    ) : list ? (
      <select {...base} defaultValue={str(value)}>
        <option value="">{f.required ? "Choose…" : "None"}</option>
        {list.map((x) => <option key={x.id} value={x.id}>{x.label}</option>)}
      </select>
    ) : f.type === "money" ? <input {...base} type="number" step="0.01" min="0" inputMode="decimal" defaultValue={value == null ? "" : Number(value) / 100} />
    : f.type === "number" ? <input {...base} type="number" step="1" min={f.min} max={f.max} defaultValue={str(value ?? f.min ?? 0)} />
    : f.type === "date" ? <input {...base} type="date" defaultValue={str(value).slice(0, 10)} />
    : <input {...base} type={f.type === "email" ? "email" : "text"} maxLength={f.max} defaultValue={str(value)} />;
  return (
    <label className="flex flex-col gap-2 text-sm font-medium">
      <span>
        {f.label}
        {f.required && <span aria-hidden="true" className="text-muted"> *</span>}
      </span>
      {el}
      {f.hint && <span className="text-[13px] font-normal text-muted">{f.hint}</span>}
    </label>
  );
}

function RecordForm({ kind, record, o, onDone }: { kind: Kind; record: Row; o: Options; onDone: () => void }) {
  const r = RESOURCES[kind];
  const [saved, save, saving] = useActionState<Result, FormData>(saveRecord, {});
  const [removed, remove, removing] = useActionState<Result, FormData>(deleteRecord, {});
  useEffect(() => {
    if (saved.ok || removed.ok) onDone();
  }, [saved.ok, removed.ok, onDone]);

  return (
    <form action={save} className="flex h-full flex-col">
      <header className="flex items-center justify-between gap-4 border-b border-line p-5">
        <h2 className="text-xl font-medium tracking-[-0.02em]">{record.id ? `Edit ${r.singular}` : `New ${r.singular}`}</h2>
        <button type="button" onClick={onDone} aria-label="Close" className="grid h-10 w-10 place-items-center rounded-full border border-line transition-colors hover:border-fg/50">
          <X size={16} aria-hidden="true" />
        </button>
      </header>
      <input type="hidden" name="kind" value={kind} />
      {record.id && <input type="hidden" name="id" value={record.id} />}
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
        {r.fields.map((f: Field) => (
          <Input key={f.name} f={f} value={record[f.name]} o={o} />
        ))}
      </div>
      <footer className="flex flex-wrap items-center gap-3 border-t border-line p-5">
        <Button type="submit" variant="accent" disabled={saving || removing}>
          {saving ? "Saving…" : "Save"}
        </Button>
        {record.id && (
          <button
            formAction={remove}
            formNoValidate
            disabled={saving || removing}
            onClick={(e) => !confirm(`Delete this ${r.singular}? This can't be undone.`) && e.preventDefault()}
            className="inline-flex min-h-[44px] items-center rounded-full border border-line px-5 text-sm text-danger transition-colors hover:border-danger/60"
          >
            {removing ? "Deleting…" : "Delete"}
          </button>
        )}
        <p role="status" className="text-sm text-danger">
          {saved.error ?? removed.error}
        </p>
      </footer>
    </form>
  );
}

/** Side drawer on a native <dialog> (focus trap, Esc, inert page). `record` null = closed, {} = new. */
export default function RecordDialog({ kind, record, options, onClose }: { kind: Kind; record: Row | null; options: Options; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (record && !d?.open) d?.showModal();
    if (!record && d?.open) d.close();
  }, [record]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      data-lenis-prevent
      aria-label={RESOURCES[kind].title}
      className="m-0 ml-auto h-[100dvh] max-h-none w-full max-w-[520px] border-l border-line bg-surface text-fg backdrop:bg-black/60 backdrop:backdrop-blur-sm open:animate-[rise_.35s_cubic-bezier(.22,1,.36,1)]"
    >
      {record && <RecordForm kind={kind} record={record} o={options} onDone={onClose} />}
    </dialog>
  );
}
