// Generates the importable n8n workflows in n8n/workflows/. Run: node scripts/build-n8n-workflows.mjs
// The JSON holds no secrets: Code nodes read GRAVITYY_* from the n8n environment ($env), and the Gmail node has
// no credential attached (pick "Gmail (send only)" after import). Edit this file, not the generated JSON.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";

const OUT = new URL("../n8n/workflows/", import.meta.url);
const uuid = (s) => {
  const h = createHash("sha256").update(s).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
};

// ---------- shared Code-node snippets ----------
// Signed call into the app: X-Gravityy-Signature t=<unix>,v1=HMAC-SHA256(GRAVITYY_CALLBACK_SECRET, "t.body"), single-use X-Request-Id.
const API = `const crypto = require('crypto');
async function api(ctx, action, body) {
  const raw = JSON.stringify(body);
  const t = Math.floor(Date.now() / 1000);
  const sig = crypto.createHmac('sha256', $env.GRAVITYY_CALLBACK_SECRET).update(t + '.' + raw).digest('hex');
  const res = await ctx.helpers.httpRequest({
    method: 'POST', url: $env.GRAVITYY_APP_URL.replace(/\\/+$/, '') + '/api/automation/' + action, body: raw, json: false, timeout: 30000,
    headers: { 'Content-Type': 'application/json', 'X-Gravityy-Signature': 't=' + t + ',v1=' + sig, 'X-Request-Id': crypto.randomUUID() },
  });
  return typeof res === 'string' ? JSON.parse(res) : res;
}
`;

// Verifies the app's signed webhook over the raw body, rejects stale timestamps and unexpected event types/versions.
const verify = (type) => `const crypto = require('crypto');
const item = $input.first();
const header = String((item.json.headers || {})['x-gravityy-signature'] || '');
let raw;
try { raw = (await this.helpers.getBinaryDataBuffer(0, 'data')).toString('utf8'); } catch (e) { raw = JSON.stringify(item.json.body); }
const parts = Object.fromEntries(header.split(',').map((p) => p.split('=')));
const t = Number(parts.t);
if (!t || Math.abs(Date.now() / 1000 - t) > 300) throw new Error('Missing or stale signature timestamp');
const expected = Buffer.from(crypto.createHmac('sha256', $env.GRAVITYY_WEBHOOK_SECRET).update(t + '.' + raw).digest('hex'));
const given = Buffer.from(String(parts.v1 || ''));
if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) throw new Error('Bad signature');
const event = JSON.parse(raw);
if (event.type !== '${type}' || event.version !== 1) throw new Error('Unexpected event ' + event.type + ' v' + event.version);
return [{ json: event }];`;

// Idempotency: one run per (workflow, event id). A finished run means this delivery is a duplicate.
const dedupe = (wf) => `${API}
const event = $input.first().json;
const run = await api(this, 'run.start', { workflow: '${wf}', key: event.id, trigger: 'outbox', input: { execution_id: $execution.id, event_id: event.id, data: event.data } });
return [{ json: { ...event, duplicate: run.duplicate === true } }];`;

const stopIfDuplicate = `const event = $('Deduplicate').first().json;
if (event.duplicate) return [];`;

const finish = (wf, output) => `${API}
const event = $('Deduplicate').first().json;
await api(this, 'run.finish', { workflow: '${wf}', key: event.id, status: 'succeeded', output: ${output} });
return $input.all();`;

// ---------- node builders ----------
const at = (i, row = 0) => [i * 240, row * 200];
const code = (name, jsCode, i, extra = {}) => ({
  id: uuid(`${name}${jsCode}`), name, type: "n8n-nodes-base.code", typeVersion: 2, position: at(i), parameters: { jsCode }, ...extra,
});
const retry = { retryOnFail: true, maxTries: 3, waitBetweenTries: 3000 };
const webhook = (path) => ({
  id: uuid(`webhook-${path}`), name: "Signed webhook", type: "n8n-nodes-base.webhook", typeVersion: 2, position: at(0), webhookId: uuid(`hook-${path}`),
  parameters: { httpMethod: "POST", path, responseMode: "responseNode", options: { rawBody: true } },
});
const respond = (i) => ({
  id: uuid(`respond-${i}`), name: "Accept (202)", type: "n8n-nodes-base.respondToWebhook", typeVersion: 1.1, position: at(i),
  parameters: { respondWith: "json", responseBody: "={{ { accepted: true, duplicate: $json.duplicate } }}", options: { responseCode: 202 } },
});
const chain = (nodes) => Object.fromEntries(nodes.slice(0, -1).map((n, i) => [n.name, { main: [[{ node: nodes[i + 1].name, type: "main", index: 0 }]] }]));
const workflow = (name, nodes, settings = {}) => ({
  name, nodes, connections: chain(nodes), active: false, pinData: {},
  settings: { executionOrder: "v1", saveDataErrorExecution: "all", saveDataSuccessExecution: "all", saveManualExecutions: true, ...settings },
  meta: { templateCredsSetupCompleted: false }, tags: [],
});
// Event-driven workflow: webhook → verify → dedupe → 202 → steps → finish.
const eventFlow = (name, wf, path, type, steps, output) => workflow(name, [
  webhook(path),
  code("Verify signature", verify(type), 1),
  code("Deduplicate", dedupe(wf), 2, retry),
  respond(3),
  ...steps.map((s, i) => ({ ...s, position: at(4 + i) })),
  code("Finish run", finish(wf, output), 4 + steps.length, retry),
]);

// ---------- A · inbound leads ----------
const A = eventFlow("Gravityy · A · Inbound leads", "A-inbound-lead", "gravityy-inbound-lead", "lead.created", [
  code("Verify email + rescore", `${stopIfDuplicate}
${API}
// Reoon runs inside the app and only when REOON_API_KEY is set there (paid, off by default).
const lead = await api(this, 'lead.enrich', { lead_id: event.data.lead_id });
return [{ json: { ...lead, suppressed: event.data.suppressed } }];`, 0, retry),
  code("Notify admin", `${API}
const l = $input.first().json;
await api(this, 'notify.admin', {
  subject: 'New ' + (l.qualification === 'mql' ? 'qualified ' : '') + 'lead: ' + (l.name || 'Unnamed') + ' (' + l.score + ')',
  fields: { Score: String(l.score), Qualification: l.qualification, Source: l.source, Company: l.company || '-', 'Email check': l.email_status + ' (' + l.verification + ')',
    Suppressed: String(l.suppressed), Open: $env.GRAVITYY_APP_URL + '/admin/leads' },
});
return $input.all();`, 0, retry),
  code("Response draft (optional)", `${API}
const l = $input.first().json;
// Optional: a reply draft for qualified, non-suppressed leads. A draft only; an admin approves and sends.
if ($env.GRAVITYY_REPLY_DRAFTS === 'false' || l.qualification !== 'mql' || l.suppressed || !l.contact_id) return [{ json: { ...l, draft: 'skipped' } }];
const d = await api(this, 'outreach.draft', { contact_id: l.contact_id, lead_id: l.lead_id, purpose: 'reply' });
return [{ json: { ...l, draft: d.created ? d.draft_id : (d.reason || (d.reasons || []).join('; ')) } }];`, 0, retry),
], "{ score: $input.first().json.score, qualification: $input.first().json.qualification, draft: $input.first().json.draft }");

// ---------- B · outbound research ----------
const B = eventFlow("Gravityy · B · Outbound research", "B-outbound-research", "gravityy-outbound-research", "discovery.completed", [
  code("Analyse websites", `${stopIfDuplicate}
${API}
// The admin started the job in Admin → Discovery (approved sources only: CSV with a documented lawful basis, or an
// approved provider). The app fetches public pages within robots.txt, scores, and leaves every company in the review queue.
const totals = { analyzed: 0, failed: 0, remaining: 0, pending_review: 0 };
if (event.data.status !== 'completed' || event.data.imported === 0) return [{ json: { ...totals, skipped: true } }];
for (let i = 0; i < 40; i++) {
  const r = await api(this, 'discovery.analyze', { job_id: event.data.job_id, limit: 5 });
  totals.analyzed += r.analyzed; totals.failed += r.failed; totals.remaining = r.remaining; totals.pending_review = r.pending_review || 0;
  if (!r.remaining || r.analyzed + r.failed === 0) break;
}
return [{ json: totals }];`, 0),
  code("Notify admin", `${API}
const r = $input.first().json;
if (r.skipped) return $input.all();
await api(this, 'notify.admin', {
  subject: r.pending_review + ' companies ready for review',
  fields: { Analysed: String(r.analyzed), Failed: String(r.failed), 'Still to analyse': String(r.remaining), Review: $env.GRAVITYY_APP_URL + '/admin/discovery?review=pending' },
});
return $input.all();`, 0, retry),
], "$input.first().json");

// ---------- C · outreach drafts ----------
const C = eventFlow("Gravityy · C · Outreach drafts", "C-outreach-draft", "gravityy-outreach-draft", "outreach.draft_requested", [
  code("Check eligibility + draft", `${stopIfDuplicate}
${API}
// The app checks suppression, consent / enquiry basis and the 7-day cool-down before creating a pending-approval draft.
const d = await api(this, 'outreach.draft', { contact_id: event.data.contact_id, lead_id: event.data.lead_id, purpose: event.data.purpose });
return [{ json: d }];`, 0, retry),
  code("Notify admin", `${API}
const d = $input.first().json;
await api(this, 'notify.admin', d.draft_id
  ? { subject: 'Outreach draft ready for review', fields: { Draft: d.draft_id, Note: d.reason || 'New draft', Review: $env.GRAVITYY_APP_URL + '/admin/outreach' } }
  : { subject: 'Outreach draft not created', fields: { Reasons: (d.reasons || []).join('; ') } });
return $input.all();`, 0, retry),
], "$input.first().json");

// ---------- D · Gmail (explicit admin send only) ----------
const D = eventFlow("Gravityy · D · Gmail send", "D-gmail-send", "gravityy-gmail-send", "outreach.send_requested", [
  code("Claim send (re-validates)", `${stopIfDuplicate}
${API}
// Re-checks at send time: sending switch, approved exact version, suppression, consent, cool-down, daily limit.
const c = await api(this, 'outreach.claim_send', { send_id: event.data.send_id });
if (!c.ok) {
  await api(this, 'run.finish', { workflow: 'D-gmail-send', key: event.id, status: 'cancelled', output: c });
  await api(this, 'notify.admin', { subject: 'Send not made: ' + c.reason, fields: { Send: event.data.send_id, Detail: JSON.stringify(c.reasons || c.limit || c.status || '') } });
  return [];
}
return [{ json: c }];`, 0),
  {
    id: uuid("gmail-send"), name: "Send via Gmail", type: "n8n-nodes-base.gmail", typeVersion: 2.1, position: at(0),
    disabled: true,           // second switch: stays off until the owner enables sending (see n8n/README.md)
    onError: "continueRegularOutput",
    parameters: { sendTo: "={{ $json.to }}", subject: "={{ $json.subject }}", emailType: "text", message: "={{ $json.body }}", options: { appendAttribution: false } },
  },
  code("Record result", `${API}
const claim = $('Claim send (re-validates)').first().json;
const out = $input.first().json;
// A disabled Gmail node passes the claim through unchanged (no message id), which is recorded as a failure.
const sent = Boolean(out.id && out.threadId);
const r = await api(this, 'outreach.record_send', sent
  ? { send_id: claim.send_id, status: 'sent', message_id: out.id }
  : { send_id: claim.send_id, status: 'failed', error: (out.error && (out.error.message || String(out.error))) || 'Gmail node disabled or returned no message id' });
if (!sent) await api(this, 'notify.admin', { subject: 'Outreach send failed', fields: { Send: claim.send_id, Error: String((out.error && out.error.message) || 'no message id') } });
return [{ json: { sent, message_id: out.id || null, ...r } }];`, 0, retry),
], "$input.first().json");

// ---------- E · follow-ups (drafts only) ----------
const E = workflow("Gravityy · E · Follow-up drafts", [
  { id: uuid("e-schedule"), name: "Every weekday 09:30", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: at(0),
    parameters: { rule: { interval: [{ field: "cronExpression", expression: "30 9 * * 1-5" }] } } },
  code("Prepare follow-up drafts", `${API}
const key = 'followups-' + new Date().toISOString().slice(0, 10);
const run = await api(this, 'run.start', { workflow: 'E-follow-up', key, trigger: 'schedule', input: { execution_id: $execution.id } });
if (run.duplicate) return [];
// Sent 7+ days ago, no reply/bounce/unsubscribe, still eligible → a pending-approval draft. Never sent automatically.
const r = await api(this, 'followups.prepare', { days: 7, limit: 20 });
if (r.prepared > 0) await api(this, 'notify.admin', { subject: r.prepared + ' follow-up drafts to review', fields: { Review: $env.GRAVITYY_APP_URL + '/admin/outreach' } });
await api(this, 'run.finish', { workflow: 'E-follow-up', key, status: 'succeeded', output: r });
return [{ json: r }];`, 1, retry),
]);

// ---------- Ops: outbox pump ----------
const PUMP = workflow("Gravityy · Ops · Outbox pump", [
  { id: uuid("pump-schedule"), name: "Every minute", type: "n8n-nodes-base.scheduleTrigger", typeVersion: 1.2, position: at(0),
    parameters: { rule: { interval: [{ field: "minutes", minutesInterval: 1 }] } } },
  code("Dispatch outbox", `${API}
// The app claims due events, POSTs them signed to the A–D webhooks, and retries with backoff / dead-letters.
return [{ json: await api(this, 'outbox.dispatch', { limit: 10 }) }];`, 1),
], { saveDataSuccessExecution: "none" });

// ---------- Errors ----------
const ERRORS = workflow("Gravityy · Errors", [
  { id: uuid("error-trigger"), name: "On workflow error", type: "n8n-nodes-base.errorTrigger", typeVersion: 1, position: at(0), parameters: {} },
  code("Log + notify admin", `${API}
const e = $input.first().json;
await api(this, 'run.fail', {
  execution_id: String(e.execution.id || ''), workflow_name: (e.workflow && e.workflow.name) || 'unknown', node: e.execution.lastNodeExecuted || undefined,
  error: String((e.execution.error && e.execution.error.message) || 'Unknown error').slice(0, 4000), url: e.execution.url || undefined,
});
return $input.all();`, 1, retry),
]);

mkdirSync(OUT, { recursive: true });
const files = { "A-inbound-leads.json": A, "B-outbound-research.json": B, "C-outreach-drafts.json": C, "D-gmail-send.json": D, "E-follow-up-drafts.json": E, "ops-outbox-pump.json": PUMP, "errors.json": ERRORS };
for (const [file, wf] of Object.entries(files)) writeFileSync(new URL(file, OUT), JSON.stringify(wf, null, 2) + "\n");
console.log(`Wrote ${Object.keys(files).length} workflows to n8n/workflows/`);
