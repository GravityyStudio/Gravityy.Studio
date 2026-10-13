// Captures hero screenshots (desktop 16:10) of live client projects for the Work section.
// Usage: node scripts/capture-work.mjs  → public/media/work-<slug>.jpg (+ prints page title/summary text)
import { chromium } from "playwright";

const SITES = [
  ["viara", "https://viara-studios.vercel.app/"],
  ["athlex", "https://athlex-delta.vercel.app/"],
];
const browser = await chromium.launch();
for (const [slug, url] of SITES) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });
  await page.waitForTimeout(6000); // let intros/preloaders finish
  await page.screenshot({ path: `public/media/work-${slug}.jpg`, type: "jpeg", quality: 82 });
  const info = await page.evaluate(() => ({
    title: document.title,
    desc: document.querySelector('meta[name="description"]')?.getAttribute("content"),
    text: document.body.innerText.replace(/\s+/g, " ").slice(0, 1500),
  }));
  console.log(`== ${slug}\n${JSON.stringify(info, null, 1)}`);
  await page.close();
}
await browser.close();
