// Interaction smoke test against a running server: `npm start`, then `node scripts/interactions.mjs [url]`.
import { chromium } from "playwright";
import assert from "node:assert/strict";

const URL = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const ROUTES = ["/", "/services", "/services/web", "/solutions", "/work", "/process", "/pricing", "/faq", "/contact", "/work/viara", "/privacy", "/terms", "/team", "/testimonials"];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await chromium.launch();
const ok = (m) => console.log("  ✓", m);
const h1 = async (page) => (await page.locator("h1").first().textContent())?.trim(); // real text, not the CSS-uppercased render

// ---------- Every route: 200, one h1, no runtime errors, no horizontal scroll (390 + 1440) ----------
for (const w of [360, 390, 768, 1440]) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const r of ROUTES) {
    const res = await page.goto(URL + r, { waitUntil: "networkidle" });
    assert.equal(res.status(), 200, r);
    // Server HTML must never hide the page (a hidden wrapper delays LCP until JS runs)
    const html = await res.text();
    assert.ok(!/<(div|main)[^>]*style="opacity:0/.test(html), `${r} ships hidden content`);
    // No unfilled template placeholders on the live site
    assert.ok(!/\{\{[A-Z_]+/.test(html), `${r} shows a {{PLACEHOLDER}}`);
    assert.equal(await page.locator("h1").count(), 1, `${r} h1 count`);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${r} overflow @${w}`);
  }
  assert.deepEqual(errors, []);
  ok(`all ${ROUTES.length} routes: 200, visible server HTML, no placeholders, one h1, no errors, no horizontal scroll @${w}px`);
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

  // Morphing nav: pill after scrolling down past 80px, full bar again on scroll up
  const bar = page.locator("header nav").first();
  await page.evaluate(() => window.scrollTo(0, 900));
  await page.waitForFunction(() => document.querySelector("header nav")?.hasAttribute("inert"));
  await page.evaluate(() => window.scrollTo(0, 600));
  await page.waitForFunction(() => !document.querySelector("header nav")?.hasAttribute("inert"));
  assert.ok(await bar.isVisible());
  await page.evaluate(() => window.scrollTo(0, 0));
  ok("nav morphs to the pill on scroll down and back to the bar on scroll up");

  // Utility chips: sound is off by default and remembered; the theme button swaps the accent
  const sound = page.getByRole("button", { name: /^Sound (on|off)$/ });
  assert.equal(await sound.getAttribute("aria-pressed"), "false");
  await sound.click();
  assert.equal(await page.evaluate(() => localStorage.getItem("gs-sound")), "on");
  await sound.click();
  const accent = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
  const before = await accent();
  await page.getByRole("button", { name: /^Theme: / }).click();
  assert.notEqual(await accent(), before);
  await page.reload({ waitUntil: "networkidle" });
  assert.notEqual(await accent(), before, "theme preset survives a reload");
  await page.evaluate(() => (localStorage.removeItem("gs-palette"), delete document.documentElement.dataset.palette));
  ok("sound chip is off by default and persists; theme button swaps accent + glow and persists");

  // Hero: one primary and one secondary CTA; the primary goes to the audit form
  const hero = page.locator("#top");
  assert.equal(await hero.getByRole("link").count(), 2);
  await hero.getByRole("link", { name: "Get a free audit" }).click();
  await page.locator("#audit").waitFor();
  ok("hero has exactly two CTAs; 'Get a free audit' reaches #audit");

  // Audit form: inline validation, then the success state (API stubbed: no real request is filed)
  await page.route("**/api/audit", (r) => r.fulfill({ json: { ok: true, message: "Got it. Your audit will arrive within 3 working days." } }));
  const audit = page.locator("#audit");
  await audit.getByRole("button", { name: "Send my free audit" }).click();
  await audit.getByText("Enter a valid website URL.").waitFor();
  assert.equal(await audit.getByLabel("Website URL").getAttribute("aria-invalid"), "true");
  await page.waitForFunction(() => document.activeElement?.getAttribute("name") === "url", null, { timeout: 3000 }); // focus moves after render
  await audit.getByLabel("Website URL").fill("example.com");
  await audit.getByLabel("Work email").fill("asha@example.com");
  await audit.getByRole("button", { name: "Send my free audit" }).click();
  await audit.getByText("Request received.").waitFor();
  ok("audit form: inline error focuses the field, then shows the success state");
  // Back to the top; let Lenis's smoothing settle (it can drift after a programmatic jump), then wait for the full bar
  await page.evaluate(() => window.scrollTo(0, 0));
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForFunction(() => scrollY === 0 && !document.querySelector("header nav")?.hasAttribute("inert"));
  await sleep(600);

  // Nav → Pricing page (client-side), active state
  await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Pricing" }).click();
  await page.waitForURL(URL + "/pricing");
  assert.equal(await h1(page), "Pricing");
  assert.equal(await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Pricing" }).getAttribute("aria-current"), "page");
  ok("nav link opens /pricing and marks it current");

  // Nav dropdown: the chevron opens the Services panel (aria-expanded), Esc closes it and returns focus
  const primary = page.getByRole("navigation", { name: "Primary" }).first();
  const servicesBtn = primary.getByRole("button", { name: "Services menu" });
  await servicesBtn.click();
  assert.equal(await servicesBtn.getAttribute("aria-expanded"), "true");
  await primary.getByRole("link", { name: "All services →" }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await servicesBtn.getAttribute("aria-expanded"), "false");
  assert.equal(await primary.getByRole("button", { name: "हिं (coming soon)" }).getAttribute("aria-disabled"), "true");
  ok("nav dropdown opens and closes with Esc; Hindi is marked coming soon");
  await sleep(800);

  // Configurator → quote prefill
  await page.locator("#configurator").scrollIntoViewIfNeeded();
  await page.getByRole("button", { name: "Mobile Apps" }).click();
  await sleep(800);
  assert.match(await page.locator("#configurator aside").innerText(), /₹2,70,000/); // (60k+30k+180k) × 1 × 1
  ok("estimate updates when a service is toggled (₹2,70,000)");
  await page.locator("#configurator").getByRole("button", { name: "Talk to us first" }).click();
  const dialog = page.getByRole("dialog", { name: "Start a Project" });
  await dialog.waitFor();
  assert.match(await dialog.locator("textarea").inputValue(), /Configurator estimate: ₹2,70,000 \(≈ \$3,250\)/);
  ok("'Talk to us first' opens the contact modal with the estimate prefilled");
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
  assert.equal(await page.evaluate(() => document.activeElement?.textContent?.trim()), "Talk to us first");
  ok("contact form validates, submits, Esc closes and focus returns");

  // Live price: region and engagement are radio groups; the figure is announced as a status
  await page.locator("#pricing").scrollIntoViewIfNeeded();
  // Prices are live plan rows, so assert on currency and on change, not on fixed amounts.
  const price = page.locator("#pricing [role=status]").first();
  const label = () => price.getAttribute("aria-label");
  assert.match(await label(), /₹[\d,]+/);
  await page.locator("#pricing label", { hasText: "USD $" }).click();
  const usdBuild = await label();
  // USD is a labelled placeholder until confirmed (lib/billing USD_CONFIRMED)
  const USD = /\$[\d,]+|price on request/;
  assert.match(usdBuild, USD);
  await page.locator("#pricing label", { hasText: "Monthly grow" }).click();
  assert.match(await label(), /^Grow: (from \$[\d,]+ per month|price on request)/);
  await page.keyboard.press("ArrowLeft");
  assert.equal(await label(), usdBuild);
  ok("live price switches region and plan by click and arrow keys");

  // FAQ page: accordion with aria-expanded
  await page.goto(URL + "/faq", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#faq button[aria-expanded]").count(), 6);
  const q = page.getByRole("button", { name: "How is pricing calculated?" });
  await q.click();
  assert.equal(await q.getAttribute("aria-expanded"), "true");
  assert.ok(await page.getByRole("region", { name: "How is pricing calculated?" }).isVisible());
  ok("/faq lists all 6 questions; accordion toggles aria-expanded and shows the answer");

  // Work page: every project, client letters, showreel
  await page.goto(URL + "/work", { waitUntil: "networkidle" });
  assert.equal(await page.locator("#work [data-case]").count(), 6);
  assert.equal(await page.locator("#voices blockquote").count(), 3);
  await page.getByRole("button", { name: "Play the showreel" }).click();
  const reel = page.getByRole("dialog", { name: "Gravityy Studio showreel" });
  await reel.waitFor();
  for (let i = 0; i < 6; i++) await page.keyboard.press("Tab");
  assert.ok(await page.evaluate(() => !!document.activeElement?.closest('[role="dialog"]')));
  await page.keyboard.press("Escape");
  await reel.waitFor({ state: "detached" });
  ok("/work shows all 6 projects and 3 client letters; showreel modal traps focus, Esc closes");

  // Work filters: chips narrow the card grid and announce the count
  await page.getByRole("button", { name: "Mobile app", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("#work [data-case]").length === 1);
  assert.equal(await page.getByRole("button", { name: "Mobile app", exact: true }).getAttribute("aria-pressed"), "true");
  await page.getByRole("button", { name: "All", exact: true }).click();
  await page.waitForFunction(() => document.querySelectorAll("#work [data-case]").length === 6);
  ok("work filters narrow the grid (Mobile app → 1) and All restores 6");

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

// ---------- Signed in: "Client login" becomes "Dashboard" with a profile initial ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.addCookies([{ name: "sb-test-auth-token", value: "x", url: URL }]);
  const page = await ctx.newPage();
  await page.route("**/api/me", (r) => r.fulfill({ json: { signedIn: true, name: "Asha", href: "/portal" } }));
  await page.goto(URL, { waitUntil: "networkidle" });
  const dash = page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: /^Dashboard/ });
  await dash.waitFor();
  assert.equal(await dash.getAttribute("href"), "/portal");
  assert.equal(await page.getByRole("navigation", { name: "Primary" }).first().getByRole("link", { name: "Client login" }).count(), 0);
  ok("signed in: nav shows Dashboard with a profile initial instead of Client login");
  await ctx.close();
}

// ---------- Testimonial slider: Next moves the track ----------
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(URL + "/testimonials", { waitUntil: "networkidle" });
  const track = page.getByRole("list", { name: "Testimonials" });
  await page.getByRole("button", { name: "Next testimonial" }).click();
  await page.waitForFunction(() => (document.querySelector('[aria-label="Testimonials"]')?.scrollLeft ?? 0) > 0);
  assert.ok((await track.locator("figcaption").count()) >= 1);
  ok("testimonial slider: Next scrolls to the next card; each card has a name");
  await page.close();
}

// ---------- Mobile ----------
{
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  await page.goto(URL, { waitUntil: "networkidle" });
  await sleep(1200);
  const burger = page.getByRole("button", { name: "Open menu", exact: true });
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
