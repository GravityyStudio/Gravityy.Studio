"use client";
import { useActionState, useState, useTransition, type ReactNode } from "react";
import Button from "@/components/ui/Button";
import { createProspect, importCsv, rescoreAll, resetScoring, runDiscovery, saveScoring, type ActionState } from "@/app/admin/discovery/actions";
import type { ProviderView, ScoringView } from "./types";

const label = "flex flex-col gap-2 text-sm font-medium";
const hint = "text-[13px] font-normal leading-relaxed text-muted";

function Shell({ title, intro, children }: { title: string; intro: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="pr-10">
        <h3 id="dialog-h" className="text-xl font-medium tracking-[-0.02em]">{title}</h3>
        <p className={`mt-1 ${hint}`}>{intro}</p>
      </div>
      {children}
    </div>
  );
}
const Status = ({ s }: { s: ActionState }) => <p role="status" className={`text-sm ${s.error ? "text-danger" : "text-accent"}`}>{s.error ?? s.message}</p>;
const LegalBasis = () => (
  <label className={label}>
    Lawful basis / permission
    <textarea name="legal_basis" required minLength={10} maxLength={500} rows={2} className="field resize-y" placeholder="e.g. Our own list of businesses we met at the Mumbai Retail Expo 2026; company data only." />
    <span className={hint}>Recorded on the import job. Needed so every dataset has a documented source.</span>
  </label>
);

export function AddProspectForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(createProspect, {});
  return (
    <Shell title="Add a company" intro="Company-level details only. Duplicates are caught by website domain.">
      <form action={action} className="grid gap-4 sm:grid-cols-2">
        <label className={`${label} sm:col-span-2`}>Company name *<input name="name" required maxLength={200} className="field" /></label>
        <label className={`${label} sm:col-span-2`}>Website<input name="website" placeholder="acme.com" className="field" /></label>
        <label className={label}>Industry<input name="industry" maxLength={120} className="field" placeholder="Dental clinic" /></label>
        <label className={label}>Category<input name="category" maxLength={120} className="field" placeholder="Healthcare" /></label>
        <label className={label}>City<input name="city" maxLength={120} className="field" /></label>
        <label className={label}>Country<input name="country" maxLength={2} className="field uppercase" placeholder="IN" /></label>
        <label className={label}>
          Company size
          <select name="size_band" className="field" defaultValue="">
            <option value="">Unknown</option>
            {["1-10", "11-50", "51-200", "201-1000", "1000+"].map((s) => <option key={s} value={s}>{s} employees</option>)}
          </select>
        </label>
        <label className={label}>Intent signals<input name="intent_signals" className="field" placeholder="requested_quote; referral" /></label>
        <label className={`${label} sm:col-span-2`}>Notes<textarea name="notes" maxLength={2000} rows={2} className="field resize-y" /></label>
        <div className="flex flex-wrap items-center gap-4 sm:col-span-2">
          <Button type="submit" variant="accent" disabled={pending}>{pending ? "Adding…" : "Add company"}</Button>
          <Status s={state} />
        </div>
      </form>
    </Shell>
  );
}

export function ImportForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(importCsv, {});
  return (
    <Shell title="Import companies from CSV" intro={<>Columns: <code>name</code>, <code>website</code>, <code>industry</code>, <code>category</code>, <code>city</code>, <code>region</code>, <code>country</code>, <code>size</code>, <code>intent_signals</code>, <code>notes</code>. Up to 1,000 rows / 1 MB. Files with personal columns (email, phone, names, LinkedIn) are refused.</>}>
      <form action={action} className="flex flex-col gap-4">
        <label className={label}>CSV file<input name="file" type="file" accept=".csv,text/csv" required className="text-sm file:mr-4 file:min-h-[40px] file:rounded-full file:border file:border-line file:bg-bg file:px-4 file:text-fg" /></label>
        <LegalBasis />
        <div className="flex flex-wrap items-center gap-4"><Button type="submit" variant="accent" disabled={pending}>{pending ? "Importing…" : "Import"}</Button><Status s={state} /></div>
      </form>
    </Shell>
  );
}

export function DiscoverForm({ providers }: { providers: ProviderView[] }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(runDiscovery, {});
  const enabled = providers.filter((p) => p.enabled);
  return (
    <Shell title="Run discovery" intro="Search an authorised business-data provider by category and location. Results respect each provider's storage rules.">
      {!enabled.length ? (
        <div className="rounded-2xl border border-line p-4 text-sm leading-relaxed text-muted">
          No provider is enabled. {providers.map((p) => p.label).join(", ")} can be switched on by adding its API key to the server environment. These are paid services, so they stay off until you approve one. Meanwhile, add companies manually or import a CSV.
        </div>
      ) : (
        <form action={action} className="grid gap-4 sm:grid-cols-2">
          <label className={`${label} sm:col-span-2`}>
            Provider
            <select name="provider" className="field">{enabled.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}</select>
            <span className={hint}>{enabled[0]?.note}</span>
          </label>
          <label className={label}>Business category<input name="category" required minLength={2} maxLength={80} className="field" placeholder="dental clinic" /></label>
          <label className={label}>Location<input name="location" required minLength={2} maxLength={80} className="field" placeholder="Pune, India" /></label>
          <label className={label}>Max results<input name="max" type="number" min={1} max={60} defaultValue={20} className="field" /></label>
          <div className="sm:col-span-2"><LegalBasis /></div>
          <div className="flex flex-wrap items-center gap-4 sm:col-span-2"><Button type="submit" variant="accent" disabled={pending}>{pending ? "Searching…" : "Search"}</Button><Status s={state} /></div>
        </form>
      )}
    </Shell>
  );
}

const WEIGHTS: [keyof ScoringView["weights"], string][] = [["industryFit", "Industry fit"], ["websiteNeeds", "Website needs"], ["projectBudget", "Project budget"], ["purchaseIntent", "Purchase intent"]];

export function ScoringForm({ scoring }: { scoring: ScoringView }) {
  const [state, action, pending] = useActionState<ActionState, FormData>(saveScoring, {});
  const [weights, setWeights] = useState(scoring.weights);
  const [extra, setExtra] = useState<ActionState>({});
  const [busy, start] = useTransition();
  const sum = Object.values(weights).reduce((a, b) => a + (Number(b) || 0), 0);
  return (
    <Shell title="Scoring model" intro="Deterministic, 100 points. Each lead shows exactly which rules gave it points; components without data score 0 and lower the confidence.">
      <form action={action} className="flex flex-col gap-4">
        <fieldset className="grid grid-cols-2 gap-3">
          <legend className="mb-2 text-sm font-medium">Weights <span className={sum === 100 ? "text-accent" : "text-danger"}>({sum} / 100)</span></legend>
          {WEIGHTS.map(([k, l]) => (
            <label key={k} className={label}>{l}<input name={k} type="number" min={0} max={100} value={weights[k]} onChange={(e) => setWeights({ ...weights, [k]: Number(e.target.value) })} className="field tabular-nums" /></label>
          ))}
        </fieldset>
        <label className={label}>Target industries<textarea name="targetIndustries" rows={3} defaultValue={scoring.targetIndustries.join(", ")} className="field resize-y" /><span className={hint}>Full industry points. Comma or one per line; matched against industry and category.</span></label>
        <label className={label}>Adjacent industries<textarea name="adjacentIndustries" rows={2} defaultValue={scoring.adjacentIndustries.join(", ")} className="field resize-y" /><span className={hint}>Half industry points.</span></label>
        <label className={label}>Qualified at<input name="qualifyThreshold" type="number" min={0} max={100} defaultValue={scoring.qualifyThreshold} className="field tabular-nums" /></label>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" variant="accent" disabled={pending || sum !== 100}>{pending ? "Saving…" : "Save"}</Button>
          <button type="button" disabled={busy} onClick={() => start(async () => setExtra(await rescoreAll()))} className="min-h-[44px] rounded-full border border-line-strong px-4 text-sm hover:border-fg/60">Rescore all</button>
          <button type="button" disabled={busy} onClick={() => confirm("Reset scoring to the defaults?") && start(async () => setExtra(await resetScoring()))} className="min-h-[44px] rounded-full px-4 text-sm text-muted hover:text-fg">Reset defaults</button>
        </div>
        <Status s={extra.error || extra.message ? extra : state} />
      </form>
    </Shell>
  );
}
