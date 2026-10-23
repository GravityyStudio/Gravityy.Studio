"use client";
import { useState } from "react";
import { Building2, FileUp, Radar, SlidersHorizontal } from "lucide-react";
import Modal from "@/components/ui/Modal";
import DiscoveryFilters from "./DiscoveryFilters";
import ProspectDetail, { ScoreBadge, StatusChip } from "./ProspectDetail";
import { AddProspectForm, DiscoverForm, ImportForm, ScoringForm } from "./Forms";
import { location, type AnalysisView, type Filters, type ProspectView, type ProviderView, type ScoringView } from "./types";

type Props = {
  prospects: ProspectView[];
  analyses: Record<string, AnalysisView>;
  filters: Filters;
  error: string | null;
  stats: { total: number; pending: number; approved: number; qualified: number; average: number | null };
  industries: string[];
  categories: string[];
  providers: ProviderView[];
  scoring: ScoringView;
};
type Dialog = "add" | "import" | "discover" | "scoring" | null;

const DIALOGS: { id: Exclude<Dialog, null>; label: string; icon: typeof Radar }[] = [
  { id: "add", label: "Add company", icon: Building2 },
  { id: "import", label: "Import CSV", icon: FileUp },
  { id: "discover", label: "Run discovery", icon: Radar },
  { id: "scoring", label: "Scoring", icon: SlidersHorizontal },
];

export default function DiscoveryDashboard({ prospects, analyses, filters, error, stats, industries, categories, providers, scoring }: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const open = prospects.find((p) => p.id === openId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-medium tracking-[-0.03em]">Discovery</h2>
          <p className="mt-2 max-w-[640px] text-[15px] leading-relaxed text-muted">
            Find and qualify companies before outreach. Company data only: no personal contact details are collected, and nothing is emailed automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {DIALOGS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setDialog(id)}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${id === "add" ? "bg-accent text-bg hover:brightness-110" : "border border-line-strong hover:border-fg/60 hover:bg-fg/[0.06]"}`}
            >
              <Icon size={16} aria-hidden="true" /> {label}
            </button>
          ))}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        {[
          ["Prospects", stats.total],
          ["Pending review", stats.pending],
          ["Approved", stats.approved],
          [`Qualified (≥${scoring.qualifyThreshold})`, stats.qualified],
          ["Average score", stats.average ?? "—"],
        ].map(([label, value]) => (
          <div key={label} className="card p-4">
            <dt className="text-[13px] text-muted">{label}</dt>
            <dd className="mt-1 text-2xl font-medium tabular-nums tracking-[-0.03em]">{value}</dd>
          </div>
        ))}
      </dl>

      <DiscoveryFilters filters={filters} industries={industries} categories={categories} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div className="card overflow-x-auto" data-lenis-prevent>
        <table className="w-full min-w-[860px] text-left text-sm">
          <caption className="sr-only">Discovered prospects, highest score first</caption>
          <thead>
            <tr className="border-b border-line">
              {["Company", "Industry · category", "Location", "Source", "Research", "Review", "Score"].map((h) => (
                <th key={h} scope="col" className="px-4 py-3 font-mono text-[11px] font-normal uppercase tracking-[0.12em] text-muted">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="[&>tr:not(:last-child)]:border-b [&>tr]:border-line">
            {prospects.map((p) => (
              <tr key={p.id} className="cursor-pointer transition-colors hover:bg-raised/60" onClick={() => setOpenId(p.id)}>
                <td className="px-4 py-3">
                  <button type="button" onClick={(e) => (e.stopPropagation(), setOpenId(p.id))} className="text-left font-medium hover:text-accent">{p.name}</button>
                  <span className="block text-[13px] text-muted">{p.domain ?? "No website"}</span>
                </td>
                <td className="px-4 py-3 text-muted">{[p.industry, p.category].filter(Boolean).join(" · ") || "—"}</td>
                <td className="px-4 py-3 text-muted">{location(p) ?? "—"}</td>
                <td className="px-4 py-3 text-muted">{p.source === "api" ? p.provider.replace(/_/g, " ") : p.source === "csv_upload" ? "CSV" : "Manual"}</td>
                <td className="px-4 py-3"><StatusChip value={p.research_status} /></td>
                <td className="px-4 py-3"><StatusChip value={p.company_id ? "in CRM" : p.review_status} /></td>
                <td className="px-4 py-3"><ScoreBadge score={p.score} threshold={scoring.qualifyThreshold} confidence={p.breakdown?.confidence} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {!prospects.length && (
          <p className="px-6 py-14 text-center text-sm text-muted">
            No prospects {filters.q || filters.industry || filters.location ? "match these filters" : "yet. Add a company or import a CSV to start"}.
          </p>
        )}
      </div>

      <Modal open={Boolean(open)} onClose={() => setOpenId(null)} labelledBy="prospect-h" className="max-w-[860px]">
        {open && <ProspectDetail p={open} analysis={analyses[open.id] ?? null} threshold={scoring.qualifyThreshold} />}
      </Modal>
      <Modal open={dialog !== null} onClose={() => setDialog(null)} labelledBy="dialog-h">
        {dialog === "add" && <AddProspectForm />}
        {dialog === "import" && <ImportForm />}
        {dialog === "discover" && <DiscoverForm providers={providers} />}
        {dialog === "scoring" && <ScoringForm scoring={scoring} />}
      </Modal>
    </div>
  );
}
