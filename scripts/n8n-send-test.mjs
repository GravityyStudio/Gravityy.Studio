// Sends a signed test payload, exactly as the app or n8n would. Secrets come from the environment, never arguments.
//   App → n8n event:    N8N_OUTBOUND_SECRET=… node scripts/n8n-send-test.mjs https://n8n.example.com/webhook-test/gravityy-inbound-lead n8n/test-payloads/event.lead.created.json
//   n8n → app callback: N8N_CALLBACK_SECRET=… node scripts/n8n-send-test.mjs http://localhost:3000/api/automation/notify.admin n8n/test-payloads/callback.notify.admin.json
import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";

const [url, file] = process.argv.slice(2);
if (!url || !file) throw new Error("Usage: node scripts/n8n-send-test.mjs <url> <payload.json>");
const callback = url.includes("/api/automation/");
const secret = process.env[callback ? "N8N_CALLBACK_SECRET" : "N8N_OUTBOUND_SECRET"];
if (!secret) throw new Error(`Set ${callback ? "N8N_CALLBACK_SECRET" : "N8N_OUTBOUND_SECRET"} in the environment.`);

const body = JSON.stringify(JSON.parse(readFileSync(file, "utf8")));
const t = Math.floor(Date.now() / 1000);
const headers = { "Content-Type": "application/json", "X-Gravityy-Signature": `t=${t},v1=${createHmac("sha256", secret).update(`${t}.${body}`).digest("hex")}` };
if (callback) headers["X-Request-Id"] = randomUUID();
else headers["X-Gravityy-Event-Id"] = JSON.parse(body).id;

const res = await fetch(url, { method: "POST", headers, body });
console.log(res.status, await res.text());
