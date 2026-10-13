import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth";
import { LOCAL, type CmsKey } from "@/lib/content";
import ShapeEditor from "./ShapeEditor";

type Props = { entryKey: CmsKey; part?: string; pick?: string[]; title: string; intro?: ReactNode; children?: ReactNode };

/** Loads a CMS entry (Supabase, else the local default) and renders the structured editor for it, a part of it, or picked keys. */
export default async function CmsShapePage({ entryKey, part, pick, title, intro, children }: Props) {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("cms_entries").select("value").eq("key", entryKey).maybeSingle<{ value: Record<string, unknown> }>();
  const local = LOCAL[entryKey] as Record<string, unknown>;
  const full = { ...local, ...(data?.value ?? {}) };
  const base = (Array.isArray(local) ? (data?.value ?? local) : part ? (full[part] ?? local[part]) : full) as Record<string, unknown>;
  const value = pick ? Object.fromEntries(pick.map((k) => [k, base[k] ?? local[k]])) : base;

  return (
    <div>
      <h2 className="text-2xl font-medium tracking-[-0.03em]">{title}</h2>
      {intro && <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">{intro}</p>}
      {children}
      <div className="mt-6">
        <ShapeEditor key={part ?? entryKey} entryKey={entryKey} part={part} value={JSON.parse(JSON.stringify(value))} />
      </div>
    </div>
  );
}
