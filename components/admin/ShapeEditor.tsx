"use client";
import { useActionState, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import Button from "@/components/ui/Button";
import { saveCmsPart, type Result } from "@/app/admin/actions";

type Json = string | number | boolean | null | Json[] | { [k: string]: Json };
type Obj = { [k: string]: Json };

const LONG = /desc|lede|summary|quote|sub|body|answer|a$|alt|notes|text/i;
const HEX = /^#[0-9a-f]{6}$/i;
const label = (k: string) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());
const isObj = (v: Json): v is Obj => typeof v === "object" && v !== null && !Array.isArray(v);

/** Empty copy of a list item, used as the template for "Add". */
function blank(v: Json): Json {
  if (Array.isArray(v)) return [];
  if (isObj(v)) return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)]));
  return typeof v === "number" ? 0 : typeof v === "boolean" ? false : "";
}

function Node({ name, value, set }: { name: string; value: Json; set: (v: Json) => void }) {
  const text = label(name);
  if (typeof value === "boolean")
    return (
      <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-sm font-medium">
        <input type="checkbox" checked={value} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--accent))]" />
        {text}
      </label>
    );
  if (typeof value === "number")
    return (
      <label className="flex flex-col gap-2 text-sm font-medium">
        {text}
        <input type="number" step="any" value={value} onChange={(e) => set(e.target.valueAsNumber || 0)} className="field tabular-nums" />
      </label>
    );
  if (typeof value === "string" || value === null) {
    const v = value ?? "";
    return (
      <label className="flex flex-col gap-2 text-sm font-medium">
        {text}
        {HEX.test(v) ? (
          <span className="flex items-center gap-3">
            <input type="color" value={v} onChange={(e) => set(e.target.value)} aria-label={`${text} picker`} className="h-12 w-14 cursor-pointer rounded-xl border border-line bg-bg p-1" />
            <input value={v} onChange={(e) => set(e.target.value)} pattern="#[0-9a-fA-F]{6}" className="field font-mono" />
          </span>
        ) : LONG.test(name) || v.length > 90 ? (
          <textarea value={v} rows={3} onChange={(e) => set(e.target.value)} className="field resize-y" />
        ) : (
          <input value={v} onChange={(e) => set(e.target.value)} className="field" />
        )}
      </label>
    );
  }
  if (Array.isArray(value) && !value.some((x) => typeof x === "object" && x !== null))
    return (
      <label className="flex flex-col gap-2 text-sm font-medium">
        {text} <span className="text-[13px] font-normal text-muted">One per line</span>
        <textarea value={value.join("\n")} rows={Math.max(3, value.length + 1)} onChange={(e) => set(e.target.value.split("\n"))} className="field resize-y" />
      </label>
    );
  if (Array.isArray(value)) return <List name={text} items={value} set={set} />;
  return (
    <fieldset className="flex flex-col gap-4 rounded-2xl border border-line p-4">
      <legend className="px-2 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{text}</legend>
      <Fields value={value} set={set} />
    </fieldset>
  );
}

function Fields({ value, set }: { value: Obj; set: (v: Obj) => void }) {
  return (
    <>
      {Object.entries(value).map(([k, v]) => (
        <Node key={k} name={k} value={v} set={(x) => set({ ...value, [k]: x })} />
      ))}
    </>
  );
}

function List({ name, items, set }: { name: string; items: Json[]; set: (v: Json[]) => void }) {
  const swap = (i: number, j: number) => {
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    set(next);
  };
  const title = (it: Json, i: number) => (isObj(it) && Object.values(it).find((x) => typeof x === "string" && x)) || `Item ${i + 1}`;
  const btn = "grid h-9 w-9 place-items-center rounded-full border border-line transition-colors hover:border-fg/50 disabled:opacity-30";
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        {name} <span className="text-muted">({items.length})</span>
      </p>
      {items.map((it, i) => (
        <details key={i} className="group rounded-2xl border border-line bg-bg">
          <summary className="flex min-h-[52px] cursor-pointer list-none items-center gap-3 px-4">
            <ChevronDown size={16} aria-hidden="true" className="shrink-0 text-muted transition-transform group-open:rotate-180" />
            <span className="min-w-0 flex-1 truncate text-sm">{String(title(it, i))}</span>
            <span className="flex gap-1" onClick={(e) => e.preventDefault()}>
              <button type="button" aria-label="Move up" disabled={!i} onClick={() => swap(i, i - 1)} className={btn}>
                <ChevronUp size={14} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Move down" disabled={i === items.length - 1} onClick={() => swap(i, i + 1)} className={btn}>
                <ChevronDown size={14} aria-hidden="true" />
              </button>
              <button type="button" aria-label="Remove" onClick={() => confirm("Remove this item?") && set(items.filter((_, j) => j !== i))} className={`${btn} text-danger`}>
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </span>
          </summary>
          <div className="flex flex-col gap-4 border-t border-line p-4">
            {isObj(it) ? <Fields value={it} set={(v) => set(items.map((x, j) => (j === i ? v : x)))} /> : <Node name={`${name} ${i + 1}`} value={it} set={(v) => set(items.map((x, j) => (j === i ? v : x)))} />}
          </div>
        </details>
      ))}
      <button
        type="button"
        onClick={() => set([...items, blank(items[0] ?? "")])}
        className="inline-flex min-h-[44px] w-fit items-center gap-2 rounded-full border border-dashed border-line-strong px-4 text-sm transition-colors hover:border-fg/60"
      >
        <Plus size={14} aria-hidden="true" /> Add item
      </button>
    </div>
  );
}

/**
 * Form editor for a CMS value: inputs are inferred from the JSON shape (text, long text, color, number, toggle,
 * line lists, nested groups, reorderable item lists). Saves through saveCmsPart and publishes.
 */
export default function ShapeEditor({ entryKey, part, value }: { entryKey: string; part?: string; value: Json }) {
  const [data, setData] = useState<Json>(value);
  const [state, action, pending] = useActionState<Result, FormData>(saveCmsPart, {});
  // Line lists keep blank lines while typing; drop them on save.
  const clean = (v: Json): Json => (Array.isArray(v) ? v.filter((x) => x !== "").map(clean) : isObj(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)])) : v);

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="key" value={entryKey} />
      {part && <input type="hidden" name="part" value={part} />}
      <input type="hidden" name="value" value={JSON.stringify(clean(data))} />
      <div className="card flex flex-col gap-5 p-5 sm:p-6">{isObj(data) ? <Fields value={data} set={setData} /> : <Node name={entryKey} value={data} set={setData} />}</div>
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-4 rounded-full border border-line bg-surface/90 p-2 pr-5 backdrop-blur w-fit">
        <Button type="submit" variant="accent" disabled={pending}>
          {pending ? "Saving…" : "Save & publish"}
        </Button>
        <p role="status" className={`text-sm ${state.error ? "text-danger" : "text-accent"}`}>
          {state.error ?? (state.ok ? "Saved. The live site is updated." : "")}
        </p>
      </div>
    </form>
  );
}
