// Automation checks: signing both ways (app ⇄ n8n snippets), envelopes, Reoon mapping, drafts, workflow JSON hygiene.
// Run: npx tsx scripts/check-automation.mts
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { signPayload, verifyStripeSignature } from "../lib/webhook-verify";
import { buildEvent, toEnvelope } from "../lib/events/contracts";
import { mapReoonStatus } from "../lib/automation/reoon";
import { followupDraft, outreachDraft, replyDraft } from "../lib/automation/drafts";
import { ROUTES } from "../lib/automation/dispatch";

const require = createRequire(import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async () => {}).constructor;
const WS = "11111111-1111-4111-8111-111111111111";
const LEAD = "22222222-2222-4222-8222-222222222222";
let n = 0;
const ok = (name: string, fn: () => unknown | Promise<unknown>) => Promise.resolve(fn()).then(() => { n++; }, (e) => { console.error(`✗ ${name}`); throw e; });

// ---------- signatures ----------
await ok("sign/verify round trip", () => {
  const sig = signPayload('{"a":1}', "s3cret");
  assert.ok(verifyStripeSignature('{"a":1}', sig, "s3cret"));
  assert.ok(!verifyStripeSignature('{"a":2}', sig, "s3cret"), "tampered body");
  assert.ok(!verifyStripeSignature('{"a":1}', sig, "other"), "wrong secret");
  assert.ok(!verifyStripeSignature('{"a":1}', signPayload('{"a":1}', "s3cret", Date.now() - 600_000), "s3cret"), "stale");
});

// ---------- envelopes ----------
const row = (topic: string, payload: unknown) => ({ id: "33333333-3333-4333-8333-333333333333", topic, workspace_id: WS, payload, created_at: "2026-10-23T09:00:00Z" });
await ok("bare lead.created is wrapped", () => {
  const r = toEnvelope(row("lead.created", { lead_id: LEAD, source: "contact", score: 65, qualification: "mql", suppressed: false }));
  assert.ok("event" in r);
  assert.equal(r.event.id, "33333333-3333-4333-8333-333333333333");
  assert.equal(r.event.type, "lead.created");
});
await ok("personal data is rejected by the contract", () => {
  const r = toEnvelope(row("lead.created", { lead_id: LEAD, source: "contact", score: 65, qualification: "mql", suppressed: false, email: "x@example.test" }));
  assert.ok("error" in r);
});
await ok("unknown topic is rejected", () => assert.ok("error" in toEnvelope(row("lead.deleted", {}))));
await ok("enveloped events pass through", () => {
  const ev = buildEvent("outreach.send_requested", WS, { send_id: LEAD, draft_id: LEAD, draft_version: 2 });
  const r = toEnvelope(row("outreach.send_requested", ev));
  assert.ok("event" in r && r.event.id === ev.id);
});

await ok("test payloads match their contracts", () => {
  const dir = new URL("../n8n/test-payloads/", import.meta.url);
  for (const f of readdirSync(dir).filter((x) => x.startsWith("event."))) {
    const ev = JSON.parse(readFileSync(new URL(f, dir), "utf8"));
    assert.ok("event" in toEnvelope(row(ev.type, ev)), f);
  }
});

// ---------- Reoon + drafts ----------
await ok("reoon mapping", () => {
  assert.equal(mapReoonStatus("valid"), "valid");
  assert.equal(mapReoonStatus("disposable"), "invalid");
  assert.equal(mapReoonStatus("catch_all"), "risky");
  assert.equal(mapReoonStatus(undefined), "unknown");
});
await ok("draft templates", () => {
  for (const d of [replyDraft("Asha Rao", "audit"), replyDraft("", "contact"), outreachDraft("Ravi", null), outreachDraft("Ravi", "Acme"), followupDraft("Ravi", "x".repeat(200))]) {
    assert.ok(d.subject.length >= 1 && d.subject.length <= 200, d.subject);
    assert.ok(!/undefined|null/.test(d.subject + d.body));
  }
  assert.match(replyDraft("Asha Rao", "audit").body, /^Hi Asha,/);
});

// ---------- workflow JSON ----------
const dir = new URL("../n8n/workflows/", import.meta.url);
const flows = readdirSync(dir).map((f) => ({ file: f, text: readFileSync(new URL(f, dir), "utf8") }));
await ok("workflow files exist", () => assert.equal(flows.length, 7));
await ok("no secrets or credentials in exported JSON", () => {
  for (const { file, text } of flows) {
    assert.ok(!/"credentials"\s*:/.test(text), `${file}: credentials`);
    assert.ok(!/[0-9a-f]{32,}|sk_live|sk_test|Bearer\s+[A-Za-z0-9]|eyJhbGci|"password"|api[_-]?key=/i.test(text.replace(/"id": "[^"]+"|"webhookId": "[^"]+"/g, "")), `${file}: secret-like value`);
  }
});
await ok("every Code node is valid JavaScript", () => {
  for (const { file, text } of flows) for (const node of JSON.parse(text).nodes) {
    if (node.type === "n8n-nodes-base.code") assert.doesNotThrow(() => new AsyncFunction("$input", "$env", "$execution", "$", "require", node.parameters.jsCode), `${file} › ${node.name}`);
  }
});
await ok("Gmail node is disabled and has no retry", () => {
  const gmail = JSON.parse(flows.find((f) => f.file.startsWith("D-"))!.text).nodes.find((x: { type: string }) => x.type === "n8n-nodes-base.gmail");
  assert.equal(gmail.disabled, true);
  assert.ok(!gmail.retryOnFail);
});
await ok("webhook paths match the dispatcher routes", () => {
  const paths = flows.flatMap(({ text }) => JSON.parse(text).nodes.filter((x: { type: string }) => x.type === "n8n-nodes-base.webhook").map((x: { parameters: { path: string } }) => x.parameters.path));
  assert.deepEqual(new Set(paths), new Set(Object.values(ROUTES)));
});

// ---------- the n8n snippets against the app's signer/verifier ----------
const nodeCode = (file: string, name: string) => JSON.parse(flows.find((f) => f.file === file)!.text).nodes.find((x: { name: string }) => x.name === name).parameters.jsCode as string;
const env = { GRAVITYY_WEBHOOK_SECRET: "outbound-test", GRAVITYY_CALLBACK_SECRET: "callback-test", GRAVITYY_APP_URL: "https://app.example.test/" };
const runNode = (code: string, input: unknown[], ctx: unknown) =>
  new AsyncFunction("$input", "$env", "$execution", "$", "require", code).call(ctx, { first: () => input[0], all: () => input }, env, { id: "exec-1" }, () => ({ first: () => input[0] }), require);

await ok("n8n verifies the app's signed event", async () => {
  const ev = buildEvent("lead.created", WS, { lead_id: LEAD, source: "contact", score: 65, qualification: "mql", suppressed: false });
  const raw = JSON.stringify(ev);
  const item = { json: { headers: { "x-gravityy-signature": signPayload(raw, env.GRAVITYY_WEBHOOK_SECRET) }, body: ev } };
  const ctx = { helpers: { getBinaryDataBuffer: async () => Buffer.from(raw) } };
  const out = await runNode(nodeCode("A-inbound-leads.json", "Verify signature"), [item], ctx);
  assert.equal(out[0].json.id, ev.id);
  const forged = { json: { headers: { "x-gravityy-signature": signPayload(raw, "wrong") }, body: ev } };
  await assert.rejects(runNode(nodeCode("A-inbound-leads.json", "Verify signature"), [forged], ctx), /Bad signature/);
  const wrongType = JSON.stringify({ ...ev, type: "crm.updated" });
  await assert.rejects(runNode(nodeCode("A-inbound-leads.json", "Verify signature"), [{ json: { headers: { "x-gravityy-signature": signPayload(wrongType, env.GRAVITYY_WEBHOOK_SECRET) } } }],
    { helpers: { getBinaryDataBuffer: async () => Buffer.from(wrongType) } }), /Unexpected event/);
});

await ok("the app verifies n8n's signed callback", async () => {
  const calls: { url: string; body: string; headers: Record<string, string> }[] = [];
  const ctx = { helpers: { httpRequest: async (r: { url: string; body: string; headers: Record<string, string> }) => (calls.push(r), JSON.stringify({ ok: true, claimed: 0 })) } };
  const out = await runNode(nodeCode("ops-outbox-pump.json", "Dispatch outbox"), [{ json: {} }], ctx);
  assert.equal(out[0].json.ok, true);
  assert.equal(calls[0].url, "https://app.example.test/api/automation/outbox.dispatch");
  assert.ok(verifyStripeSignature(calls[0].body, calls[0].headers["X-Gravityy-Signature"], env.GRAVITYY_CALLBACK_SECRET));
  assert.match(calls[0].headers["X-Request-Id"], /^[0-9a-f-]{36}$/);
});

await ok("a disabled Gmail node is recorded as failed, never as sent", async () => {
  const calls: { url: string; body: string }[] = [];
  const claim = { ok: true, send_id: LEAD, to: "client@example.test", subject: "Hi", body: "b" };
  const ctx = { helpers: { httpRequest: async (r: { url: string; body: string }) => (calls.push(r), JSON.stringify({ ok: true, status: "failed" })) } };
  // Disabled node → passes the claim item through unchanged.
  await new AsyncFunction("$input", "$env", "$execution", "$", "require", nodeCode("D-gmail-send.json", "Record result"))
    .call(ctx, { first: () => ({ json: claim }), all: () => [{ json: claim }] }, env, { id: "e" }, () => ({ first: () => ({ json: claim }) }), require);
  const record = JSON.parse(calls[0].body);
  assert.equal(record.status, "failed");
});

console.log(`automation: ${n} checks passed`);
