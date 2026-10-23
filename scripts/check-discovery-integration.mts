// Website-analysis integration test: real HTTP against a local test site. Run: npx tsx scripts/check-discovery-integration.mts
// The SSRF guard blocks 127.0.0.1, so the test opts out with { allowPrivateNetwork: true } (never used by the app),
// then separately proves the guard blocks the same URL without it.
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { analyzeWebsite } from "../lib/discovery/analyze.ts";
import { USER_AGENT } from "../lib/discovery/fetcher.ts";

const seen: { method: string; url: string; ua: string }[] = [];
const html = (body: string, head = "") => `<!doctype html><html lang="en"><head><title>Test site</title>${head}</head><body>${body}</body></html>`;

function site(req: IncomingMessage, res: ServerResponse) {
  seen.push({ method: req.method ?? "", url: req.url ?? "", ua: req.headers["user-agent"] ?? "" });
  const send = (status: number, body: string, type = "text/html; charset=utf-8", headers: Record<string, string> = {}) => {
    res.writeHead(status, { "content-type": type, ...headers });
    res.end(req.method === "HEAD" ? undefined : body);
  };
  switch (req.url) {
    case "/robots.txt": return send(200, "User-agent: *\nDisallow: /private\n", "text/plain");
    case "/":
      return send(200, html(
        `<nav><a href="/ok">Services</a><a href="/missing">Pricing</a><a href="/private/area">Team</a><a href="/redirect-ok">Work</a></nav>
         <p>${"Real content for people. ".repeat(20)}</p><a href="/contact">Contact us</a>`,
        '<meta name="viewport" content="width=device-width">',
      ));
    case "/ok": case "/contact": return send(200, html("<h1>Fine</h1>"));
    case "/missing": return send(404, html("Not found"));
    case "/private/area": return send(200, html("Secret"));
    case "/redirect-ok": return send(302, "", "text/plain", { location: "/ok" });
    case "/loop": return send(302, "", "text/plain", { location: "/loop" });
    case "/blocked": return send(403, html("<p>Just a moment...</p>"));
    case "/challenge": return send(200, html('<div class="g-recaptcha"></div><p>Verify you are human</p>'));
    case "/json": return send(200, '{"ok":true}', "application/json");
    case "/big": return send(200, html(`<h1>Big</h1><a href="/contact">Contact</a><nav><a href="/ok">x</a></nav>${"<p>filler</p>".repeat(160_000)}`, '<meta name="viewport" content="width=device-width">'));
    default: return send(404, html("Not found"));
  }
}

const listen = (handler: (req: IncomingMessage, res: ServerResponse) => void) =>
  new Promise<{ base: string; close: () => void }>((resolve) => {
    const server = createServer(handler).listen(0, "127.0.0.1", () => {
      resolve({ base: `http://127.0.0.1:${(server.address() as AddressInfo).port}`, close: () => server.close() });
    });
  });

const { base, close } = await listen(site);
const down = await listen((req, res) => { res.writeHead(req.url === "/robots.txt" ? 500 : 200, { "content-type": "text/html" }); res.end(html("<h1>x</h1>")); });
const opts = { allowPrivateNetwork: true };
try {
  // Full analysis: findings, robots-aware link checks, redirects followed.
  const a = await analyzeWebsite(`${base}/`, opts);
  assert.equal(a.status, "ok", a.error ?? "");
  const byId = Object.fromEntries(a.findings.map((f) => [f.id, f]));
  assert.equal(byId["broken-link:/missing"]?.certainty, "confirmed", "404 link is a confirmed broken link");
  assert.ok(!Object.keys(byId).some((k) => k.includes("/ok") || k.includes("redirect-ok")), "working and redirecting links are fine");
  assert.ok(!seen.some((r) => r.url === "/private/area"), "robots.txt Disallow: the private link is never requested");
  assert.equal(byId["no-https"]?.certainty, "confirmed");
  assert.equal(byId["h1-missing"]?.certainty, "confirmed");
  assert.equal(byId["description-missing"]?.severity, "medium");
  assert.ok(!byId["cta-missing"], "the page has a Contact us link");
  assert.ok(!byId["viewport-missing"]);
  assert.ok(seen.every((r) => r.ua === USER_AGENT), "every request identifies the bot");
  assert.ok(seen.filter((r) => r.url === "/missing").every((r) => r.method === "HEAD"), "link checks use HEAD");

  // Never worked around: refusals and challenges stop the analysis.
  const blocked = await analyzeWebsite(`${base}/blocked`, opts);
  assert.equal(blocked.status, "blocked");
  assert.equal(blocked.httpStatus, 403);
  assert.equal(blocked.findings.length, 0);
  const before = seen.length;
  const challenge = await analyzeWebsite(`${base}/challenge`, opts);
  assert.equal(challenge.status, "blocked");
  assert.match(challenge.error ?? "", /challenge/);
  assert.equal(seen.slice(before).filter((r) => r.url === "/challenge").length, 1, "a challenge is not retried");

  assert.equal((await analyzeWebsite(`${base}/private/area`, opts)).status, "robots_disallowed");
  assert.equal((await analyzeWebsite(`${base}/json`, opts)).status, "not_html");
  const loop = await analyzeWebsite(`${base}/loop`, opts);
  assert.equal(loop.status, "error");
  assert.match(loop.error ?? "", /redirects/);
  const big = await analyzeWebsite(`${base}/big`, opts);
  assert.equal(big.status, "ok");
  assert.equal(big.bytes, 1_500_000, "body capped at 1.5 MB");
  assert.ok(big.findings.some((f) => f.id === "page-truncated"));

  // RFC 9309: robots.txt answering 5xx means "assume disallowed".
  assert.equal((await analyzeWebsite(`${down.base}/`, opts)).status, "robots_disallowed");

  // The SSRF guard is on by default: same local URL, no opt-out → refused before any request.
  const n = seen.length;
  const unsafe = await analyzeWebsite(`${base}/`);
  assert.equal(unsafe.status, "error");
  assert.match(unsafe.error ?? "", /port|public internet/);
  assert.equal(seen.length, n, "no request reached the private server");
} finally {
  close();
  down.close();
}
console.log("discovery integration ok");
