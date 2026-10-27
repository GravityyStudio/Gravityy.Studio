# Redesign v3: deliverables

Branch `feat/redesign-v3`. Tokens live in `app/tokens.css` and the system is described in `DESIGN.md`.

## Assumptions

1. **Dark only.** The spec defines one palette, so the light theme and theme toggle are removed.
2. **Display weight 650.** The spec allows 600–700; 650 is the middle of that range on Manrope Variable.
3. **Glow and grid.** The glow is a single fixed layer behind content that crossfades by section. It is not
   per-section paint.
4. **One audit form.** The audit form lives in the footer (`#audit`) on every page, and every "Get a free audit" CTA
   scrolls to it.
5. **Pricing source.** Prices come from the live `plans` table. The USD figure is the plan's USD price, shown next to
   INR.
6. **Custom cursor.** It only appears on fine pointers with hover and with motion allowed. Touch users never see it.
7. **Footer ball.** The ball drops once when the wordmark scrolls into view, and again when the pointer enters it.
8. **Social links.** Real profile URLs are used where the CMS has them. A bare domain (e.g. `linkedin.com`) renders as
   a labelled `{{LINKEDIN_URL}}` placeholder rather than a dead link.
9. **llms.txt.** It is now a dynamic route (`app/llms.txt/route.ts`) built from CMS content and live prices, so it
   can't drift out of date.

## Placeholders to fill before launch

Search the repo for `{{`.

| Placeholder | Where | What goes there |
|---|---|---|
| `{{CLIENT_LOGO}}` ×4 | `components/home/Trust.tsx` (LogoStrip) | Approved client logos (SVG, with alt text) |
| `{{FOUNDER_PHOTO}}`, `{{FOUNDER_NAME}}`, `{{FOUNDER_ROLE}}`, `{{FOUNDER_BIO}}` | `Trust.tsx` (TeamBlock) | Portrait 4:5 and a 2–3 sentence bio |
| `{{METRIC}}`, `{{RESULT_LABEL}}` | `components/home/WorkCards.tsx` (Viara, ATHLEX) | Confirmed result numbers only |
| `{{TESTIMONIAL}}`, `{{NAME}}`, `{{ROLE}}`, `{{COMPANY}}` | `components/home/HomeVoices.tsx` | A quote used with the client's permission |
| `{{LINKEDIN_URL}}`, `{{INSTAGRAM_URL}}` | Footer, via CMS → Site → socials | Full profile URLs |

## To do at merge

- **CMS → Theme:** set accent to `#cdfb50` and radius to `22`. The live entry still holds `#A8F01E` / 24, which
  overrides `tokens.css` at runtime.
- **USD prices:** USD is still $1,490 / $590 while INR is now ₹19,999 / ₹34,999. Confirm the USD figures in
  `plans`.
- **FAQ copy:** one FAQ answer refers to "the configurator above"; check it still reads right in the new order.

## Change log: the seven issues

| Issue | Before | After |
|---|---|---|
| 1. Hero | Generic statement | "Websites & apps that convert." with "Products that land." |
| 2. CTAs | Mixed labels ("Start a project", "Get a quote") | "Get a free audit" / "See the work"; pricing "Start a website" / "Talk to us first" |
| 3. Audit form | Sentence-with-blanks, single error line | "Send my free audit", a 3-step promise, labelled fields, inline errors, focus to the first error, loading and success states |
| 4. Trust | Quotes only | Logo strip, testimonial cards and slot, founder/team block, Viara/ATHLEX metric slots (nothing invented) |
| 5. Social | Bare domains | Real URLs or labelled placeholders |
| 6. SEO | `meta keywords`, partial schema, static llms.txt | Keywords removed; Organization + ProfessionalService, Service, FAQPage, BreadcrumbList and Offer JSON-LD; dynamic llms.txt; sitemap, robots, canonical, OG |
| 7. Pricing | INR only | INR/USD toggle with the other currency's starting price shown alongside |

Also new in v3: Manrope Variable, the token file, the ten motion signatures (see DESIGN.md), service rows, node
network, case cards, the scroll rail and the footer wordmark. Removed: `HomeCta`, `ThemeToggle`, `public/llms.txt`.

## QA checklist

Measured on a local production build (`next build && next start`).

| Check | Result |
|---|---|
| Interaction tests (`node scripts/interactions.mjs`): nav, menu, hero CTAs, audit form validation/success, pricing toggles, FAQ accordion | PASS |
| LCP < 1.5s, phone at 4× CPU and slow 4G | PASS (≈0.9–1.2s; desktop ≈0.4s) |
| CLS 0 | PASS (≤0.0002) |
| Main-thread blocking, desktop | PASS (≈40–110ms) |
| Main-thread blocking, phone at 4× CPU | WATCH (≈1.4–1.5s, mostly React and framework hydration plus GSAP evaluation) |
| Lighthouse ≥95 | NOT RUN: running Lighthouse via `npx` was blocked in this environment. Run it on the Vercel preview. |
| Reduced motion: all signatures off, content visible | PASS |
| Keyboard: skip link, visible focus, menu Esc and focus return, accordion, radios | PASS |
| `aria-expanded` on menu and FAQ; inert hidden nav | PASS |
| 44px targets | PASS |
| 360–1920px layout (inspector at 390 / 768 / 1440) | PASS, with 3 heuristic flags reviewed and accepted (pricing toggle above price on phones, emulated hover on service rows, the hidden half of the morphing nav) |
| No invented metrics, logos or quotes | PASS (placeholders only) |
| No `meta keywords`; JSON-LD validates | PASS |
