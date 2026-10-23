import { Search, X } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import type { Filters } from "./types";

const select = "field min-h-[44px] py-2 text-sm";

/** Plain GET form: filters live in the URL (shareable, back-button friendly, works without JS). */
export default function DiscoveryFilters({ filters: f, industries, categories }: { filters: Filters; industries: string[]; categories: string[] }) {
  const active = Boolean(f.q || f.industry || f.category || f.location || f.review !== "all" || f.research !== "any" || f.source !== "any" || f.min);
  return (
    <form method="get" action="/admin/discovery" role="search" aria-label="Filter prospects" className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
      <label className="relative sm:col-span-2 lg:col-span-2 xl:col-span-2">
        <span className="sr-only">Search name or domain</span>
        <Search size={16} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted" />
        <input name="q" defaultValue={f.q} placeholder="Company or domain" className={`${select} pl-10`} />
      </label>
      <label>
        <span className="sr-only">Industry</span>
        <input name="industry" list="disc-industries" defaultValue={f.industry} placeholder="Industry" className={select} />
        <datalist id="disc-industries">{industries.map((i) => <option key={i} value={i} />)}</datalist>
      </label>
      <label>
        <span className="sr-only">Business category</span>
        <input name="category" list="disc-categories" defaultValue={f.category} placeholder="Category" className={select} />
        <datalist id="disc-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      </label>
      <label>
        <span className="sr-only">Location</span>
        <input name="location" defaultValue={f.location} placeholder="City, region or IN" className={select} />
      </label>
      <label>
        <span className="sr-only">Review status</span>
        <select name="review" defaultValue={f.review} className={select}>
          <option value="all">Any review</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </label>
      <label>
        <span className="sr-only">Research status</span>
        <select name="research" defaultValue={f.research} className={select}>
          <option value="any">Any research</option>
          <option value="new">Not analysed</option>
          <option value="analyzed">Analysed</option>
          <option value="blocked">Blocked</option>
          <option value="failed">Failed</option>
        </select>
      </label>
      <div className="flex gap-2">
        <label className="flex-1">
          <span className="sr-only">Minimum score</span>
          <input name="min" type="number" min={0} max={100} defaultValue={f.min || ""} placeholder="Min score" className={select} />
        </label>
        <button type="submit" className="min-h-[44px] rounded-2xl bg-fg px-4 text-sm font-medium text-bg transition-colors hover:bg-fg/85">Apply</button>
      </div>
      <input type="hidden" name="source" value={f.source} />
      {active && (
        <Link href="/admin/discovery" className="inline-flex min-h-[40px] items-center gap-1 text-sm text-muted hover:text-fg sm:col-span-2 lg:col-span-4 xl:col-span-8">
          <X size={14} aria-hidden="true" /> Clear filters
        </Link>
      )}
    </form>
  );
}
