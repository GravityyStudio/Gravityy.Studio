// Screenshots of the live project sites for the /work cards: `node scripts/capture-work.mjs [slug ...]`.
// Each image is 1440 px wide and up to three screens tall, so a card can pan down the page on hover.
// Single-screen sites (a 3D scene with no scroll) are captured at one screen. Viara is left out: its scroll-driven
// story renders blank in a static capture, so work-viara.jpg is a hand-taken 1440×900 hero.
import { chromium } from "playwright";

const SITES = {
  morsiqo: "https://morsiqo.vercel.app",
  reelorbit: "https://reelorbit.vercel.app",
  stadiora: "https://stadiora.vercel.app",
  athlex: "https://athlex-delta.vercel.app",
};
const W = 1440, H = 1080, MAX = H * 3;
const only = process.argv.slice(2);

// SwiftShader so WebGL (three.js) scenes render in headless Chromium.
const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const [slug, url] of Object.entries(SITES)) {
  if (only.length && !only.includes(slug)) continue;
  const page = await (await browser.newContext({ viewport: { width: W, height: H } })).newPage();
  await page.goto(url, { waitUntil: "load", timeout: 60_000 });
  await page.waitForTimeout(4000);
  const full = await page.evaluate(() => document.documentElement.scrollHeight);
  // Scroll through once so scroll-triggered reveals have played, then return to the top.
  for (let y = 0; y < Math.min(full, MAX + H); y += 400) {
    await page.evaluate((y) => window.scrollTo(0, y), y);
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(2500);
  const height = Math.min(full, MAX);
  const shot = { path: `public/media/work-${slug}.jpg`, type: "jpeg", quality: 82, timeout: 120_000 };
  await page.screenshot(height > H ? { ...shot, fullPage: true, clip: { x: 0, y: 0, width: W, height } } : shot);
  console.log(`work-${slug}.jpg  ${W}×${height}`);
  await page.close();
}
await browser.close();
