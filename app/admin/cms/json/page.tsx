import { ArrowUpRight, Database, FileJson } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { requireAdmin } from "@/lib/auth";
import { CMS_KEYS, LOCAL } from "@/lib/content";

export const metadata = { title: "Raw JSON" };

type Entry = { key: string; published: boolean; updated_at: string };

/** Every CMS key the marketing site reads (lib/content.ts). Missing keys fall back to data/*.json until saved. */
export default async function CmsIndex() {
  const { supabase } = await requireAdmin();
  const { data } = await supabase.from("cms_entries").select("key, published, updated_at").returns<Entry[]>();
  const byKey = new Map((data ?? []).map((e) => [e.key, e]));

  return (
    <div>
      <p className="mb-8 max-w-[640px] text-[15px] leading-relaxed text-muted">
        The marketing site reads these entries through <code className="font-mono text-fg">rpc cms_published_all</code> with ISR. Saving an entry revalidates
        every page that uses it.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {CMS_KEYS.map((k, i) => {
          const e = byKey.get(k);
          const size = Array.isArray(LOCAL[k]) ? `${(LOCAL[k] as unknown[]).length} items` : "object";
          return (
            <li key={k} className="rise" style={{ animationDelay: `${i * 30}ms` }}>
              <Link href={`/admin/cms/json/${k}`} className="card group flex min-h-[120px] flex-col justify-between gap-4 p-5 transition-colors hover:border-line-strong">
                <span className="flex items-center justify-between">
                  <span className="flex items-center gap-3 text-lg font-medium">
                    <FileJson size={18} className="text-fg/70" aria-hidden="true" />
                    {k}
                  </span>
                  <ArrowUpRight size={16} className="text-muted transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
                </span>
                <span className="flex flex-wrap items-center gap-2 text-[13px] text-muted">
                  {e ? (
                    <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em] ${e.published ? "border-accent/50 text-accent" : "border-line"}`}>
                      {e.published ? "Published" : "Draft"}
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 rounded-full border border-line px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em]">
                      <Database size={11} aria-hidden="true" /> Local default
                    </span>
                  )}
                  {size}
                  {e && <span>· updated {new Date(e.updated_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}</span>}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
