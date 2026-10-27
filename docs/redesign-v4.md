# Redesign v4: deliverables

Branch `feat/redesign-v4`, built on v3 (see `docs/redesign-v3.md`). It covers the parts of the v4 brief that v3 didn't
implement. Tokens are in `app/tokens.css` and mapped in `tailwind.config.ts`; the system is in `DESIGN.md`.

## Assumptions

1. **Theme button.** "Theme" cycles accent/glow presets (Lime, Ember, Ice), because the brief says retheming changes
   only those tokens. The site stays dark; the light theme removed in v3 is not reintroduced.
2. **Sound.** A short Web Audio click on presses of links and buttons. There are no audio files. It is off by default
   and remembered per browser (`localStorage`, wrapped in try/catch).
3. **Pinned section.** The node network is the one pinned moment (desktop only). It holds while its curves draw.
4. **UI mock panel.** It sits in the empty columns of the process staircase (desktop only) and is decorative
   (`aria-hidden`).
5. **USD figure.** Per the brief, USD is a placeholder. `lib/billing.ts` has `USD_CONFIRMED = false`. While it's false:
   - USD prices show as `{{USD_PRICE}}`;
   - USD checkout is closed (page and server action), and the USD CTA opens the contact form instead;
   - USD offers are left out of JSON-LD and llms.txt.

   Set it to `true` once the GLOBAL rows in `plans` hold confirmed prices.
6. **Client login.** The existing working `/login` is kept rather than replaced with a placeholder page.
7. **Email.** The audit and contact forms already go through `lib/email.ts` (Resend, `RESEND_API_KEY` in env). They
   send an internal notification only; no automatic email goes to the visitor. The success copy no longer promises
   a confirmation email.
8. **Type scale.** The brief's 11–23.84px steps are added as `text-t-11 … text-t-24`, so Tailwind's own `text-sm/lg`
   used by the admin keep their sizes.
9. **Mobile simplifications.** Phones get no reveal blur, no pin, no float or loop animations, and no chip backdrop
   blur. The cursor becomes a tap ripple.

## Content to add (nothing is shown until it exists)

Placeholders are no longer rendered on the live site (a test fails if any `{{…}}` appears). Each block appears once its
content is added:

| Content | Where to add it | Shows |
|---|---|---|
| Client names / logos | `CLIENTS` in `components/home/Trust.tsx` | "Recently shipped for" strip |
| Founder name, role, bio, photo | `FOUNDER` in `components/home/Trust.tsx` | Team block on home |
| Results for Viara / ATHLEX | `metrics` on the case in CMS → cases | Card and case-page metrics |
| Case write-ups | `brief`, `approach`, `outcome` on each case in CMS → cases | Case-study story sections |
| Testimonials | CMS → testimonials | "In their words" |
| LinkedIn / Instagram | Full profile URLs in CMS → Site → social | Footer "Follow" pills |
| USD prices | GLOBAL rows in `plans`, then `USD_CONFIRMED = true` in `lib/billing.ts` | USD price (reads "On request" until then) |

## Also needs the owner

- **Legal review.** `/privacy` and `/terms` are written from what the site actually does (Supabase, Resend, Vercel,
  Razorpay/Stripe, session cookie only). Have them reviewed. The 24-month retention period is an assumption.
- **Confirm the extra work entries.** The CMS `cases` entry also lists case-2…case-4, with metrics (−52%, 3,800 MAU,
  3.2×, …) that the brief doesn't mention. Confirm them or remove them.
- **Confirm an FAQ claim.** The answer "Around half our clients are in the US, UK, Europe and Southeast Asia" needs
  confirming.
- **Fix the CMS FAQ copy.** It still says "the configurator above". The local fallback (`data/faq.json`) is fixed;
  update the CMS entry in Admin → CMS.

## Change log (v3 → v4)

| Area | Before (v3) | After (v4) |
|---|---|---|
| Tokens | #0A0A0A base; 4 durations | #000 base, on-accent #080808, soft #c9c2da, gradient stops, spacing, radius 50, 4 shadow tokens, 6 durations, type scale, theme presets |
| Nav | Pill once past 80px | Pill on scroll down past 80px; full bar back on scroll up |
| Cursor | Lerp 0.45, uniform trail | Lerp 0.15, fading 8-dot trail; tap ripple on touch |
| Choreography | Radial glow, 10px blur, 0.94 scale, no pin | Purple section gradient crossfade, 12px blur (desktop), 0.96 scale, node network pinned, reduced-motion fade |
| Service rows | Arrow +45° | Arrow -45° |
| Node network | Static pills | Floating pills; hover lights the connection |
| UI mock panel | None | Skeleton panel with cycling lime outline |
| Rail | Line + dot | Ticks every 10% |
| Footer | Socials as text, no label | Social pills, tilted "Made to land" label, glow behind the wordmark, Privacy/Terms links |
| Utility chips | None | Sound off/on and theme button |
| Pages | No case pages, privacy or terms | `/work/[slug]` template (in sitemap, with BreadcrumbList + CreativeWork JSON-LD), `/privacy`, `/terms` |
| Pricing | USD from stale rows | USD placeholder until confirmed; checkout guarded server-side |

## QA checklist (local production build)

| Check | Result |
|---|---|
| `node scripts/interactions.mjs`: 12 routes at 390 and 1440 (200, one h1, no errors, no horizontal scroll); skip link; nav morph and scroll-up; Sound/theme chips persist; hero CTAs; audit form errors and success; pricing toggles; FAQ accordion; contact modal focus return; menu | PASS |
| LCP < 1.5s, home, phone at 4× CPU, slow 4G | PASS (≈0.6s); desktop ≈0.4s |
| LCP, case page, phone at 4× CPU | PASS (≈1.04s, after marking the project image `priority`; was 1.9s) |
| CLS 0 | PASS (0–0.0001) |
| 60fps scroll, unthrottled phone viewport | PASS (59.8 fps, p95 16.8ms) |
| 60fps scroll, emulated mid-range phone (4× CPU, headless, software raster) | PARTIAL: 47–54 fps (was 39–43 before the mobile simplifications). Page JS is under 1s of an 8s scroll; the rest is the harness's main-thread scrolling and software paint. **Confirm on a real mid-range Android phone.** |
| Lighthouse ≥ 95 ×4 | NOT RUN here (blocked in this environment). Run it on the Vercel preview. |
| Reduced motion: no Lenis, cursor, pin, loops, splitting; panels fade only | PASS (by `gsap.matchMedia` / CSS media queries) |
| WCAG: labelled controls, `aria-expanded`, `aria-pressed`, lime focus ring, 44px targets, decorative layers `aria-hidden` | PASS |
| No invented metrics, logos, quotes or prices | PASS (placeholders) |
