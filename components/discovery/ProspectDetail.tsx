"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, ExternalLink, HelpCircle, Loader2, ScanSearch, ShieldCheck, Trash2, Undo2, XCircle } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { analyze, approveToCrm, removeProspect, review, type ActionState } from "@/app/admin/discovery/actions";
import type { Finding } from "@/lib/discovery/analyze";
import { location, type AnalysisView, type ProspectView } from "./types";

const chip = "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.1em]";
export function StatusChip({ value }: { value: string }) {
  const tone = /approved|analyzed|in crm/.test(value) ? "border-accent/50 text-accent" : /rejected|failed|blocked/.test(value) ? "border-danger/40 text-danger" : "border-line text-muted";
  return <span className={`${chip} ${tone}`}>{value.replace(/_/g, " ")}</span>;
}

export function ScoreBadge({ score, threshold, confidence }: { score: number | null; threshold: number; confidence?: string }) {
  if (score === null) return <span className="text-muted">—</span>;
  const tone = score >= threshold ? "bg-accent text-bg" : score >= threshold * 0.66 ? "bg-fg/15 text-fg" : "bg-fg/[0.06] text-muted";
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`grid h-9 w-11 place-items-center rounded-xl font-medium tabular-nums ${tone}`}>{score}</span>
      {confidence && <span className="text-[12px] text-muted">{confidence}</span>}
    </span>
  );
}

const SEVERITY = { high: "bg-danger", medium: "bg-[rgb(234,179,8)]", low: "bg-fg/40" } as const;
function FindingList({ items, title, icon: Icon, hint }: { items: Finding[]; title: string; icon: typeof CheckCircle2; hint: string }) {
  if (!items.length) return null;
  return (
    <div>
      <h4 className="mb-1 flex items-center gap-2 text-sm font-medium"><Icon size={16} aria-hidden="true" /> {title} <span className="text-muted">({items.length})</span></h4>
      <p className="mb-3 text-[13px] text-muted">{hint}</p>
      <ul className="flex flex-col gap-2">
        {items.map((f) => (
          <li key={f.id} className="rounded-2xl border border-line p-3">
            <p className="flex items-center gap-2 text-sm font-medium">
              <span aria-hidden="true" className={`h-2 w-2 shrink-0 rounded-full ${SEVERITY[f.severity]}`} />
              {f.title} <span className="font-normal text-muted">· {f.severity} · {f.category}</span>
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{f.evidence}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const btn = "inline-flex min-h-[44px] items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40";

export default function ProspectDetail({ p, analysis, threshold }: { p: ProspectView; analysis: AnalysisView | null; threshold: number }) {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>({});
  const run = (fn: () => Promise<ActionState>) => start(async () => setState(await fn()));
  const b = p.breakdown;
  const confirmed = analysis?.findings.filter((f) => f.certainty === "confirmed") ?? [];
  const inferred = analysis?.findings.filter((f) => f.certainty === "inferred") ?? [];
  const facts: [string, string | null][] = [
    ["Industry", p.industry], ["Category", p.category], ["Location", location(p)], ["Company size", p.size_band ? `${p.size_band} employees` : null],
    ["Source", p.source === "api" ? `${p.provider.replace(/_/g, " ")} (API)` : p.source === "csv_upload" ? "CSV import" : "Added manually"],
    ["Intent signals", p.intent_signals.map((s) => s.replace(/_/g, " ")).join(", ") || null],
  ];

  return (
    <div className="flex flex-col gap-7">
      <header className="flex flex-wrap items-start justify-between gap-4 pr-10">
        <div>
          <h3 id="prospect-h" className="text-2xl font-medium tracking-[-0.03em]">{p.name}</h3>
          {p.website ? (
            <a href={p.website} target="_blank" rel="noopener noreferrer nofollow" className="mt-1 inline-flex items-center gap-1 text-sm text-muted hover:text-fg">
              {p.domain} <ExternalLink size={13} aria-hidden="true" /><span className="sr-only">(opens in a new tab)</span>
            </a>
          ) : <p className="mt-1 text-sm text-muted">No website listed</p>}
        </div>
        <div className="flex items-center gap-2"><StatusChip value={p.research_status} /><StatusChip value={p.company_id ? "in CRM" : p.review_status} /></div>
      </header>

      <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
        {facts.map(([k, v]) => <div key={k}><dt className="text-[13px] text-muted">{k}</dt><dd>{v ?? <span className="text-muted">Unknown</span>}</dd></div>)}
      </dl>
      {p.notes && <p className="rounded-2xl border border-line p-3 text-sm text-muted">{p.notes}</p>}
      <p className="flex gap-2 rounded-2xl bg-fg/[0.04] p-3 text-[13px] leading-relaxed text-muted">
        <ShieldCheck size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
        <span>
          {p.policy.note}
          {p.expires_at && !p.company_id && ` Expires ${new Date(p.expires_at).toLocaleDateString("en-IN", { dateStyle: "medium" })}.`}
          {` Approval copies: ${p.policy.persistable.join(", ")}.`}
          {p.policy.attribution && ` ${p.policy.attribution}.`}
        </span>
      </p>

      <section aria-labelledby="score-h">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h4 id="score-h" className="text-lg font-medium">Lead score</h4>
          <ScoreBadge score={p.score} threshold={threshold} confidence={b ? `${b.confidence} confidence` : undefined} />
        </div>
        {b ? (
          <ul className="flex flex-col gap-3">
            {b.components.map((c) => (
              <li key={c.key}>
                <div className="flex justify-between text-sm"><span>{c.label}{!c.known && <span className="text-muted"> · unknown</span>}</span><span className="tabular-nums">{c.points} / {c.max}</span></div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-fg/10" aria-hidden="true"><div className="h-full rounded-full bg-accent" style={{ width: `${c.max ? (c.points / c.max) * 100 : 0}%` }} /></div>
                <ul className="mt-1.5 text-[13px] text-muted">{c.reasons.slice(0, 4).map((r) => <li key={r}>{r}</li>)}{c.reasons.length > 4 && <li>+{c.reasons.length - 4} more</li>}</ul>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-muted">Not scored yet.</p>}
      </section>

      <section aria-labelledby="analysis-h" className="flex flex-col gap-4">
        <h4 id="analysis-h" className="text-lg font-medium">Website analysis</h4>
        {!analysis ? <p className="text-sm text-muted">{p.website ? "Not analysed yet." : "Nothing to analyse: no website."}</p> : (
          <>
            <p className="text-[13px] text-muted">
              {new Date(analysis.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })} · {analysis.status.replace(/_/g, " ")}
              {analysis.http_status ? ` · HTTP ${analysis.http_status}` : ""}{analysis.error ? ` · ${analysis.error}` : ""}
            </p>
            <FindingList items={confirmed} title="Confirmed" icon={CheckCircle2} hint="Seen directly in the page markup or an HTTP response." />
            <FindingList items={inferred} title="Needs checking" icon={HelpCircle} hint="Likely issues the markup alone can't prove (for example content added by JavaScript). Check before mentioning them to the prospect." />
            {analysis.status === "ok" && !analysis.findings.length && <p className="text-sm text-accent">No visible issues found.</p>}
          </>
        )}
        <p className="text-[12px] text-muted">Respects robots.txt and stops at logins or access challenges. Optional AI summaries are off until a provider is approved.</p>
      </section>

      <footer className="flex flex-wrap items-center gap-2 border-t border-line pt-5">
        <button type="button" disabled={pending || !p.website} onClick={() => run(() => analyze(p.id))} className={`${btn} border border-line-strong hover:border-fg/60`}>
          {pending ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <ScanSearch size={16} aria-hidden="true" />} {analysis ? "Re-analyse website" : "Analyse website"}
        </button>
        {p.company_id ? (
          <Link href="/admin/leads" className={`${btn} bg-fg/10`}>In CRM · open leads</Link>
        ) : (
          <button type="button" disabled={pending || p.review_status === "rejected"} onClick={() => confirm(`Approve ${p.name} and add it to the CRM? No email is sent.`) && run(() => approveToCrm(p.id))} className={`${btn} bg-accent text-bg hover:brightness-110`}>
            <CheckCircle2 size={16} aria-hidden="true" /> Approve & add to CRM
          </button>
        )}
        {!p.company_id && (p.review_status === "rejected" ? (
          <button type="button" disabled={pending} onClick={() => run(() => review(p.id, "pending"))} className={`${btn} border border-line hover:border-fg/50`}><Undo2 size={16} aria-hidden="true" /> Reopen</button>
        ) : (
          <button type="button" disabled={pending} onClick={() => run(() => review(p.id, "rejected"))} className={`${btn} border border-line hover:border-danger/60`}><XCircle size={16} aria-hidden="true" /> Reject</button>
        ))}
        <button type="button" disabled={pending} onClick={() => confirm(`Delete ${p.name}? Its analyses are deleted too.`) && run(() => removeProspect(p.id))} className={`${btn} ml-auto text-danger hover:bg-danger/10`} aria-label={`Delete ${p.name}`}>
          <Trash2 size={16} aria-hidden="true" />
        </button>
        <p role="status" className={`w-full text-sm ${state.error ? "text-danger" : "text-accent"}`}>{state.error ?? state.message}</p>
      </footer>
    </div>
  );
}
