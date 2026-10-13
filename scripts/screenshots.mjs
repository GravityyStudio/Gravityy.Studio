// Visual QA: per-section viewport screenshots at 390/768/1440 + scroll-through frames of pinned sections.
// Usage: npm run build && npm start (port 3000), then `npm run shots [-- http://localhost:3000] [--reduced]`.
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const URL = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3000";
const REDUCED = process.argv.includes("--reduced");
const WIDTHS = (process.argv.find((a) => a.startsWith("--w="))?.slice(4).split(",") ?? ["390", "768", "1440"]).map(Number);
const SECTIONS = ["top", "services", "solutions", "configurator", "work", "process", "stack", "analytics", "funnel", "testimonials", "pricing", "faq", "contact"];
const OUT = "shots";
mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const report = [];

for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: w < 768 ? 844 : w < 1024 ? 1024 : 900 }, reducedMotion: REDUCED ? "reduce" : "no-preference" });
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.addInitScript(() => {
    window.__cls = 0;
    new PerformanceObserver((l) => l.getEntries().forEach((e) => !e.hadRecentInput && (window.__cls += e.value))).observe({ type: "layout-shift", buffered: true });
  });
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(2500);
  const tag = `${w}${REDUCED ? "-reduced" : ""}`;
  await page.screenshot({ path: `${OUT}/${tag}-00-load.png` });

  // Walk the whole page slowly so every scroll-triggered reveal fires, like a user would.
  const total = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < total; y += 400) {
    await page.mouse.wheel(0, 400);
    await sleep(60);
  }
  await sleep(800);

  for (const [i, id] of SECTIONS.entries()) {
    const y = await page.evaluate((id) => {
      const el = document.getElementById(id);
      if (!el) return null;
      // Pinned sections are wrapped in a pin-spacer; scroll to the spacer start.
      const host = el.parentElement?.classList.contains("pin-spacer") ? el.parentElement : el;
      return host.getBoundingClientRect().top + window.scrollY;
    }, id);
    if (y === null) continue;
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await sleep(900);
    await page.screenshot({ path: `${OUT}/${tag}-${String(i + 1).padStart(2, "0")}-${id}.png` });
    // Scroll-through frames for pinned sections (desktop only).
    if (w >= 1024 && ["services", "process"].includes(id)) {
      for (const f of [0.33, 0.66, 0.99]) {
        const span = await page.evaluate((id) => {
          const sp = document.getElementById(id)?.parentElement;
          return sp?.classList.contains("pin-spacer") ? sp.offsetHeight - window.innerHeight : 0;
        }, id);
        await page.evaluate((v) => window.scrollTo(0, v), y + span * f);
        await sleep(900);
        await page.screenshot({ path: `${OUT}/${tag}-${String(i + 1).padStart(2, "0")}-${id}-${Math.round(f * 100)}.png` });
      }
    }
  }
  const stats = await page.evaluate(() => ({
    overflowX: document.documentElement.scrollWidth - window.innerWidth,
    cls: Number(window.__cls.toFixed(4)),
    h1: document.querySelectorAll("h1").length,
    canvas: !!document.querySelector("canvas"),
  }));
  report.push({ width: w, reduced: REDUCED, ...stats, errors: errors.slice(0, 5) });
  await page.close();
}
await browser.close();
console.log(JSON.stringify(report, null, 2));
