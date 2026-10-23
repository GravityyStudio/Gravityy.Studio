import Link from "next/link";
import Button from "@/components/ui/Button";
import DataTable from "@/components/app/DataTable";
import { requireAdmin } from "@/lib/auth";
import { sendingEnabled } from "@/lib/automation/actions";
import { approveDraft, dispatchNow, rejectDraft, requestDraft, requestSend, requeueEvent, saveDraft } from "./actions";

export const metadata = { title: "Outreach & automation" };

const TABS = {
  review: { label: "Review", statuses: ["draft", "pending_approval"] },
  approved: { label: "Approved", statuses: ["approved"] },
  sent: { label: "Sent / failed", statuses: ["sent", "failed"] },
  rejected: { label: "Rejected", statuses: ["rejected"] },
} as const;
type Tab = keyof typeof TABS;

const when = (d: string | null) => (d ? new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—");
const label = "flex flex-col gap-2 text-sm font-medium";
const h3 = "text-lg font-medium tracking-[-0.02em]";

type Draft = {
  id: string; purpose: string; subject: string; body: string; status: string; version: number; approved_version: number | null;
  rejected_reason: string | null; followup_of: string | null; updated_at: string; sent_at: string | null; provider_message_id: string | null;
  contacts: { full_name: string; email: string | null; email_status: string } | null;
};

export default async function OutreachPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireAdmin();
  const sp = await searchParams;
  const tab: Tab = sp.tab && sp.tab in TABS ? (sp.tab as Tab) : "review";
  const sending = sendingEnabled();

  const [drafts, sends, problems, runs, leads] = await Promise.all([
    supabase.from("outreach_drafts")
      .select("id, purpose, subject, body, status, version, approved_version, rejected_reason, followup_of, updated_at, sent_at, provider_message_id, contacts(full_name, email, email_status)")
      .in("status", [...TABS[tab].statuses]).order("updated_at", { ascending: false }).limit(100).returns<Draft[]>(),
    supabase.from("outreach_sends").select("id, draft_id, draft_version, status, error, provider_message_id, updated_at").order("updated_at", { ascending: false }).limit(20),
    supabase.from("outbox_events").select("id, topic, status, attempts, last_error, next_attempt_at, created_at").in("status", ["failed", "dead"]).order("created_at", { ascending: false }).limit(50),
    supabase.from("automation_runs").select("id, workflow, trigger, status, error, started_at, finished_at").order("started_at", { ascending: false }).limit(20),
    supabase.from("leads").select("id, name, email").not("contact_id", "is", null).order("created_at", { ascending: false }).limit(50),
  ]);

  return (
    <div className="flex flex-col gap-10">
      <div>
        <h2 className="text-2xl font-medium tracking-[-0.03em]">Outreach & automation</h2>
        <p className="mt-2 max-w-[680px] text-[15px] leading-relaxed text-muted">
          n8n prepares drafts; nothing is sent automatically. Approve a draft, then press Send. Sending is{" "}
          <strong className={sending ? "text-accent" : "text-fg"}>{sending ? "enabled" : "disabled"}</strong>
          {sending ? "." : " (set OUTREACH_SENDING_ENABLED=true on the server, plus the Gmail node in n8n, to enable)."}
        </p>
        {sp.ok && <p role="status" className="mt-4 rounded-2xl border border-line p-4 text-sm text-accent">{sp.ok}</p>}
        {sp.error && <p role="alert" className="mt-4 rounded-2xl border border-danger/40 p-4 text-sm text-danger">{sp.error}</p>}
      </div>

      <section className="flex flex-col gap-4">
        <nav className="flex flex-wrap gap-2" aria-label="Draft status">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <Link key={t} href={`/admin/outreach?tab=${t}`} aria-current={t === tab ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-sm ${t === tab ? "border-fg bg-fg text-bg" : "border-line text-muted hover:text-fg"}`}>
              {TABS[t].label}
            </Link>
          ))}
        </nav>
        {drafts.error && <p className="text-sm text-danger">{drafts.error.message}</p>}
        {!drafts.data?.length && <p className="card px-6 py-12 text-center text-sm text-muted">No drafts here.</p>}
        {drafts.data?.map((d) => {
          const approvedCurrent = d.status === "approved" && d.approved_version === d.version;
          return (
            <article key={d.id} className="card flex flex-col gap-4 p-5">
              <header className="flex flex-wrap items-baseline justify-between gap-2">
                <div>
                  <p className="font-medium">{d.contacts?.full_name ?? "Unknown contact"} <span className="text-muted">· {d.contacts?.email ?? "no email"} · email {d.contacts?.email_status ?? "—"}</span></p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">
                    {d.purpose}{d.followup_of ? " · follow-up" : ""} · v{d.version}{d.approved_version ? ` · approved v${d.approved_version}` : ""} · {d.status.replace("_", " ")} · {when(d.updated_at)}
                  </p>
                </div>
              </header>
              {d.status === "sent" || d.status === "rejected" ? (
                <div className="text-sm">
                  <p className="font-medium">{d.subject}</p>
                  <p className="mt-2 whitespace-pre-wrap text-muted">{d.body}</p>
                  {d.status === "sent" && <p className="mt-3 font-mono text-[12px] text-muted">Sent {when(d.sent_at)} · message {d.provider_message_id}</p>}
                  {d.rejected_reason && <p className="mt-3 text-[13px] text-muted">Reason: {d.rejected_reason}</p>}
                </div>
              ) : (
                <>
                  <form action={saveDraft} className="flex flex-col gap-3">
                    <input type="hidden" name="id" value={d.id} /><input type="hidden" name="tab" value={tab} />
                    <label className={label}>Subject<input name="subject" defaultValue={d.subject} required maxLength={200} className="field" /></label>
                    <label className={label}>Message<textarea name="body" defaultValue={d.body} required maxLength={20000} rows={8} className="field resize-y" /></label>
                    <div><Button type="submit" variant="ghost">Save edits</Button></div>
                  </form>
                  <div className="flex flex-wrap items-end gap-3 border-t border-line pt-4">
                    {d.status !== "approved" && (
                      <form action={approveDraft}><input type="hidden" name="id" value={d.id} /><input type="hidden" name="tab" value={tab} /><Button type="submit" variant="accent">Approve v{d.version}</Button></form>
                    )}
                    {approvedCurrent && (
                      <form action={requestSend}>
                        <input type="hidden" name="id" value={d.id} /><input type="hidden" name="tab" value={tab} />
                        <Button type="submit" variant="primary" disabled={!sending}>{sending ? `Send v${d.version}` : "Sending disabled"}</Button>
                      </form>
                    )}
                    <form action={rejectDraft} className="flex flex-wrap items-end gap-2">
                      <input type="hidden" name="id" value={d.id} /><input type="hidden" name="tab" value={tab} />
                      <input name="reason" maxLength={500} placeholder="Reason (optional)" aria-label="Rejection reason" className="field min-w-[200px]" />
                      <Button type="submit" variant="ghost">Reject</Button>
                    </form>
                  </div>
                </>
              )}
            </article>
          );
        })}
      </section>

      <section className="card flex flex-col gap-4 p-5">
        <h3 className={h3}>Request a draft</h3>
        <p className="text-[13px] leading-relaxed text-muted">Queues Workflow C. The draft is created only if the contact is eligible: not suppressed, an enquiry in the last 90 days (reply) or recorded outreach consent (outreach), and not contacted in the last 7 days.</p>
        <form action={requestDraft} className="grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
          <input type="hidden" name="tab" value={tab} />
          <label className={label}>Lead
            <select name="lead_id" required className="field" defaultValue="">
              <option value="" disabled>Choose a lead</option>
              {leads.data?.map((l) => <option key={l.id} value={l.id}>{l.name || "Unnamed"} · {l.email ?? "no email"}</option>)}
            </select>
          </label>
          <label className={label}>Purpose
            <select name="purpose" className="field" defaultValue="reply"><option value="reply">Reply to enquiry</option><option value="outreach">Outreach (consent)</option></select>
          </label>
          <Button type="submit" variant="ghost">Request draft</Button>
        </form>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className={h3}>Recent sends</h3>
        <DataTable head={["When", "Draft", "Status", "Message id / error"]} empty={!sends.data?.length && <p className="px-6 py-10 text-center text-sm text-muted">No sends yet.</p>}>
          {sends.data?.map((s) => (
            <tr key={s.id} className="align-top">
              <td className="whitespace-nowrap px-5 py-3 text-muted">{when(s.updated_at)}</td>
              <td className="px-5 py-3 font-mono text-[12px]">{s.draft_id.slice(0, 8)} · v{s.draft_version}</td>
              <td className="px-5 py-3 font-medium">{s.status}</td>
              <td className="max-w-[360px] break-all px-5 py-3 text-[13px] text-muted">{s.provider_message_id ?? s.error ?? "—"}</td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className={h3}>Dead letters & retries</h3>
          <form action={dispatchNow}><input type="hidden" name="tab" value={tab} /><Button type="submit" variant="ghost">Process queue now</Button></form>
        </div>
        <DataTable head={["Created", "Topic", "Status", "Attempts", "Last error", ""]} empty={!problems.data?.length && <p className="px-6 py-10 text-center text-sm text-muted">No failed events.</p>}>
          {problems.data?.map((e) => (
            <tr key={e.id} className="align-top">
              <td className="whitespace-nowrap px-5 py-3 text-muted">{when(e.created_at)}</td>
              <td className="px-5 py-3 font-mono text-[12px]">{e.topic}</td>
              <td className={`px-5 py-3 font-medium ${e.status === "dead" ? "text-danger" : ""}`}>{e.status}{e.status === "failed" ? ` · next ${when(e.next_attempt_at)}` : ""}</td>
              <td className="px-5 py-3">{e.attempts}</td>
              <td className="max-w-[320px] break-all px-5 py-3 text-[13px] text-muted">{e.last_error}</td>
              <td className="px-5 py-3"><form action={requeueEvent}><input type="hidden" name="id" value={e.id} /><input type="hidden" name="tab" value={tab} /><button className="text-sm underline underline-offset-4">Requeue</button></form></td>
            </tr>
          ))}
        </DataTable>
      </section>

      <section className="flex flex-col gap-4">
        <h3 className={h3}>Workflow runs</h3>
        <DataTable head={["Started", "Workflow", "Trigger", "Status", "Error"]} empty={!runs.data?.length && <p className="px-6 py-10 text-center text-sm text-muted">No runs logged yet.</p>}>
          {runs.data?.map((r) => (
            <tr key={r.id} className="align-top">
              <td className="whitespace-nowrap px-5 py-3 text-muted">{when(r.started_at)}</td>
              <td className="px-5 py-3 font-mono text-[12px]">{r.workflow}</td>
              <td className="px-5 py-3">{r.trigger}</td>
              <td className={`px-5 py-3 font-medium ${r.status === "failed" ? "text-danger" : ""}`}>{r.status}</td>
              <td className="max-w-[360px] break-all px-5 py-3 text-[13px] text-muted">{r.error}</td>
            </tr>
          ))}
        </DataTable>
      </section>
    </div>
  );
}
