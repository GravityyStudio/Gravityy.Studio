// Interaction smoke test against a running server: `npm start`, then `node scripts/interactions.mjs [url]`.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const ROUTES = ["/", "/services", "/services/web", "/solutions", "/work", "/process", "/pricing", "/faq", "/contact"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const ok = (m) => console.log("  ✓", m);
const h1 = (page) => page.locator("h1").first().innerText();

// ---------- Every route: 200, one h1, no runtime errors, no horizontal scroll (390 + 1440) ----------
for (const w of [390, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const r of ROUTES) {
    const res = await page.goto(URL + r, { waitUntil: "networkidle" });
    assert.equal(res.status(), 200, r);
    assert.equal(await page.locator("h1").count(), 1, `${r} h1 count`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${r} overflow @${w}`);
  }
  assert.deepEqual(errors, []);
  ok(`all ${ROUTES.length} routes: 200, one h1, no errors, no horizontal scroll @${w}px`);
  await page.close();
}

// ---------- Desktop flows ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(1200);

  await page.keyboard.press("Tab");
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Skip to content");
  ok("first Tab focuses the skip link");

  // Theme toggle + persistence
  const start = await page.evaluate(() => (document.documentElement.classList.contains("light") ? "light" : "dark"));
  const other = start === "dark" ? "light" : "dark";
  await page.getByRole("button", { name: `Switch to ${other} mode` }).first().click();
  assert.ok(await page.evaluate((t) => document.documentElement.classList.contains(t), other));
  await page.reload({ waitUntil: "networkidle" });
  assert.ok(await page.evaluate((t) => document.documentElement.classList.contains(t), other));
  await page.getByRole("button", { name: `Switch to ${start} mode` }).first().click();
  assert.ok(await page.evaluate((t) => document.documentElement.classList.contains(t), start));
  ok(`theme toggle switches ${start} → ${other}, persists across reload, switches back`);

  // Nav → Pricing page (client-side), active state
  await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL(URL + "/pricing");
  assert.equal(await h1(page), "Pricing");
  assert.equal(await page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Pricing" }).getAttribute("aria-current"), "page");
  ok("nav link opens /pricing and marks it current");
  await sleep(800);

  // Configurator → quote prefill
  await page.locator("#configurator").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Mobile Apps" }).click();
  await sleep(800);
  assert.match(await page.locator("#configurator aside").innerText(), /₹2,70,000/); // (60k+30k+180k) × 1 × 1
  ok("estimate updates when a service is toggled (₹2,70,000)");
  await page.getByRole("button", { name: "Get as a quote" }).click();
  const dialog = page.getByRole("dialog", { name: "Start a Project" });
  await dialog.waitFor();
  assert.match(await dialog.locator("textarea").inputValue(), /Configurator estimate: ₹2,70,000 \(≈ \$3,250\)/);
  ok("Get as a quote opens the contact modal with the estimate prefilled");
  await dialog.getByRole("button", { name: "Send brief" }).click();
  await dialog.getByText("Tell us your name.").waitFor();
  await dialog.getByLabel("Name").fill("Asha");
  await dialog.getByLabel("Email").fill("asha@example.com");
  // Stub the API: a real submit would add a test lead to the live Leads board.
  await page.route("**/api/contact", (r) => r.fulfill({ json: { ok: true, message: "Thanks. We'll reply within one working day." } }));
  await dialog.getByRole("button", { name: "Send brief" }).click();
  await dialog.getByText("Thanks, Asha.").waitFor();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "detached" });
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Get as a quote");
  ok("contact form validates, submits, Esc closes and focus returns");

  // Pricing tabs
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  await page.getByRole("tab", { name: "International" }).click();
  await page.locator("#pricing-panel").getByText("$1,490").waitFor();
  await page.keyboard.press("ArrowLeft");
  await page.locator("#pricing-panel").getByText("₹59,999").waitFor();
  ok("pricing tabs switch by click and arrow keys");

  // FAQ page: all questions
  await page.goto(URL + "/faq", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#faq button[aria-expanded]").count(), 6);
  const q = page.getByRole("button", { name: "How is pricing calculated?" });
  await q.click();
  assert.equal(await q.getAttribute("aria-expanded"), "true");
  ok("/faq lists all 6 questions; accordion toggles aria-expanded");

  // Work page: carousel + showreel
  await page.goto(URL + "/work", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#work [data-case]").count(), 6);
  await page.getByRole("button", { name: "Next testimonial" }).click();
  await sleep(600);
  assert.equal(await page.locator('[aria-roledescription="slide"][aria-label="2 of 3"]').getAttribute("aria-hidden"), "false");
  await page.getByRole("button", { name: /Watch the reel/ }).click();
  const reel = page.getByRole("dialog", { name: "Gravityy Studio showreel" });
  await reel.waitFor();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')));
  await page.keyboard.press("Escape");
  await reel.waitFor({ state: "detached" });
  ok("/work shows all 6 projects; carousel advances; showreel modal traps focus, Esc closes");

  // Services → detail page, footer link
  await page.goto(URL + "/services", { waitUntil: "networkidle" });
  await page.locator("#services").getByRole("link", { name: "Website Development" }).click();
  await page.waitForURL(URL + "/services/web");
  assert.equal(await h1(page), "Website Development");
  assert.match(await page.locator("aside").innerText(), /₹60,000/);
  ok("service card opens /services/web with its estimate (₹60,000)");
  await page.locator("footer").getByRole("link", { name: "Analytics" }).click();
  await page.waitForURL(URL + "/services/data");
  assert.equal(await h1(page), "Analytics & Dashboards");
  ok("footer link opens /services/data");
  await page.close();
}

// ---------- Mobile ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(1200);
  const burger = page.getByRole("button", { name: "Menu", exact: true });
  await burger.click();
  assert.equal(await burger.getAttribute("aria-expanded"), "true");
  const menu = page.getByRole("dialog", { name: "Menu" });
  await menu.getByRole("link", { name: "Work" }).click();
  await page.waitForURL(URL + "/work");
  await menu.waitFor({ state: "detached" });
  assert.equal(await h1(page), "Work");
  assert.ok((await page.evaluate(() => scrollY)) < 5, "new page starts at the top");
  ok("mobile menu link opens /work at the top and closes the menu");
  await page.close();
}

await browser.close();
console.log("interactions ok");
