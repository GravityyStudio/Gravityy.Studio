"use client";
import { useCallback, useState } from "react";
import { Plus } from "lucide-react";
import Button from "@/components/ui/Button";
import DataTable from "@/components/app/DataTable";
import { RESOURCES, type Field, type Kind } from "@/lib/resources";
import RecordDialog, { display, type Options, type Row } from "./RecordDialog";

/** Generic admin list: table of the resource's columns + drawer to create/edit/delete. `defaults` pre-fills new records. */
export default function RecordsView({ kind, rows, options, defaults = {} }: { kind: Kind; rows: Row[]; options: Options; defaults?: Row }) {
  const r = RESOURCES[kind];
  const [open, setOpen] = useState<Row | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const cols = r.columns.map((n) => r.fields.find((f: Field) => f.name === n)!).filter((f) => !(defaults.client_id && f.type === "client"));

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-muted">
          {rows.length} {rows.length === 1 ? r.singular : r.title.toLowerCase()}
        </p>
        <Button variant="accent" onClick={() => setOpen({ ...defaults })}>
          <Plus size={16} aria-hidden="true" /> New {r.singular}
        </Button>
      </div>
      <DataTable head={[...cols.map((c) => c.label), ""]} empty={!rows.length && <p className="px-6 py-14 text-center text-sm text-muted">No {r.title.toLowerCase()} yet.</p>}>
        {rows.map((row) => (
          <tr key={row.id} className="transition-colors hover:bg-raised/60">
            {cols.map((c, i) => (
              <td key={c.name} className={`px-5 py-3 ${i ? "" : "font-medium"}`}>
                {display(c, row, options)}
              </td>
            ))}
            <td className="px-5 py-3 text-right">
              <button onClick={() => setOpen(row)} className="inline-flex min-h-[40px] items-center rounded-full px-3 font-medium transition-colors hover:text-accent">
                Edit
              </button>
            </td>
          </tr>
        ))}
      </DataTable>
      <RecordDialog kind={kind} record={open} options={options} onClose={close} />
    </div>
  );
}
