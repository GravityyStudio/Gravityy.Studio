# Gravityy Studio: marketing site

A multi-page marketing site for Gravityy Studio with dark and light themes. It's dark and minimal, with smooth scrolling. Built with Next.js 15 (App Router), TypeScript,
Tailwind, GSAP + ScrollTrigger + SplitText, Lenis, Framer Motion (UI state only), Chart.js (lazy) and zod.
The hero is a crossfading reel of Pexels + Pixabay motion clips.

```
app/            layout (fonts, metadata, JSON-LD, GA4), page (section order), api/{contact,audit,newsletter},
                sitemap.ts, robots.ts, opengraph-image.tsx, globals.css
components/     one file per section: Preloader, Navbar, Hero (+HeroReel), Marquee, ServicesRail, Solutions,
                Configurator, CaseStack, Showreel, ProcessPinned, TechStack3D, Analytics (+Charts), Funnel,
                Stats, Testimonials, Pricing, FAQ, FinalCTA, ContactModal, Footer, CustomCursor, Providers
components/ui/  Button (magnetic), SectionHeading (masked line reveal), Tilt, CountUp, AnimatedNumber,
                LoopVideo, Modal, Icon, Honeypot
data/*.json     all copy and data arrays (services, scopes/timelines, solutions, cases, process, stack,
                funnel, testimonials, pricing, faq, nav/footer/metrics/stats, chart series)
lib/            seo.ts (metadata + JSON-LD graph), pricing.ts (configurator math), motion.ts (central motion config), gsap.ts, schemas.ts (zod),
                api.ts + email.ts (form handling / provider stub), onNear.ts, heroState.ts
hooks/          useReveal, useLazyGSAP, useFocusTrap, useFormSubmit, useMedia
scripts/        encode-media (Pexels/real footage), gen-media (placeholders), capture-work (live-site
                screenshots), check-pricing, screenshots, interactions, lighthouse
public/media/   posters + loop videos (see public/media/README.md)
```

## Setup

Requires Node 18.18+ (tested on Node 24).

```bash
npm install
cp .env.example .env.local   # optional, see below
npm run dev                  # http://localhost:3000
```

Production check: `npm run build && npm start`.

Quality gates (all pass): `npm run build`, `npm run lint`, `npm run typecheck`, plus:

```bash
node scripts/check-pricing.mts        # configurator math assertions
node scripts/interactions.mjs         # Playwright smoke test (needs `npm start` running)
npm run shots -- --w=360,390,768,1024,1440,1920   # per-section screenshots → /shots, reports overflow/CLS/errors
npm run shots -- --reduced            # same with prefers-reduced-motion
node scripts/lighthouse.mjs           # mobile Lighthouse → /lighthouse (needs Chrome; set CHROME_PATH if not found)
```

First run of the Playwright scripts: `npx playwright install chromium`.

## Environment variables

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for metadata, sitemap, robots, OG and auth/payment redirects. Optional on Vercel: if unset, the project's production domain (`VERCEL_PROJECT_PRODUCTION_URL`) is used, else `https://gravityystudio.com`. |
| `NEXT_PUBLIC_GA_ID` | GA4 measurement ID. GA loads via `next/script` (`afterInteractive`) only when this is set. |
| `RESEND_API_KEY` | Email provider. When unset, form submissions are validated and **logged to the server console** (stub). When set, sent via Resend's REST API. |
| `EMAIL_FROM` / `EMAIL_TO` | Sender / recipient for form emails. |
| `IP_HASH_SECRET` | Optional. Random string (e.g. `openssl rand -hex 32`). When set, consent records store an HMAC of the visitor IP; when unset, no IP is stored. Server-only. |

To use another provider, replace the body of `lib/email.ts` (`sendEmail(subject, fields)`). That's the only place to change.

## Platform (auth, CMS, billing)

Implements the "Gravityy Studio Platform" architecture diagram:

| Diagram block | Code |
|---|---|
| Visitor → HTTPS → **Edge proxy** (region + auth) | `proxy.ts` (mounted by `middleware.ts` on Next 15). Sets the `region` cookie from `x-vercel-ip-country` / `cf-ipcountry` (IN or unknown → `IN`, else `GLOBAL`). On `/portal`, `/admin`, `/pricing/checkout` and `/login` it calls `getUser()` (refreshing JWT cookies) and redirects signed-out users to `/login?next=…`. Marketing pages never touch Supabase. |
| **Marketing site** (ISR · CMS-driven) | `lib/content.ts` → `getContent()` calls `rpc cms_published_all` (anon key, cache tag `cms`, 5-min ISR) and merges with `data/*.json` as the fallback. Content reaches client sections via `ContentProvider` / `useContent()`. |
| **Supabase Auth** (JWT session cookies) | `/login` (email + password), `/auth/callback`, `@supabase/ssr` httpOnly cookies, `lib/auth.ts` (`getViewer`, `requireUser`, `requireAdmin`). |
| **Portal & Admin** (server components · RBAC) | `/portal` client portal with a sidebar: Overview (plan, open tickets, latest invoice, active projects, quick actions), Projects (milestone tracking), Service requests, Support tickets, Reports (spend by month, delivery, support), Plan & billing, Add-ons (request one → service request), Invoices, Settings, and an Admin panel link for admins. `/portal/invoices/[id]` stays a standalone printable page (route group `app/portal/(app)` holds the shell). `/admin` (see **Admin suite** below). Admin = `profiles.role = 'admin'`, checked in the layout and again by RLS. |
| **Supabase Postgres** (RLS · CMS · billing) | `supabase/migrations/20261013000000_platform.sql`: `profiles`, `cms_entries`, `plans`, `invoices`, `webhook_events`, RLS policies, `is_admin()`, a role-escalation guard trigger, and `cms_published_all()`. Seed: `supabase/seed.sql` (generated by `node scripts/gen-seed.mjs`). |
| **Checkout action** (server-side pricing) | `/pricing/checkout?plan=…` + `startCheckout` server action. The browser sends only a plan id; amount, GST and provider are decided server-side from `plans`. |
| **Razorpay** (IN · INR + GST) / **Stripe** (GLOBAL · USD) | `lib/payments.ts`: Razorpay Orders + Checkout.js (loaded only on checkout), and Stripe Checkout Sessions. Plain REST over `fetch`, no SDKs. |
| **Webhook routes** (signature-verified) | `/api/webhooks/razorpay` (`X-Razorpay-Signature`), `/api/webhooks/stripe` (`Stripe-Signature`, 5-min replay window), verified with `lib/webhook-verify.ts` (constant-time HMAC). Events are de-duplicated via `webhook_events`. |
| → invoice + snapshot → **Resend** | `recordPayment()` writes `invoices` (service role) with a `snapshot` of the plan and totals as charged, then emails the invoice (`sendInvoiceEmail`). |

### Admin suite

Grouped sidebar in `components/admin/AdminNav.tsx`. Migration `20261013040000_admin_suite.sql` adds `leads`, `subscriptions`, `projects`, `tickets`, `posts`, `addons`, `audit_log` and the public `media` storage bucket (all RLS: admin manages; clients read their own projects, subscriptions and tickets and can open tickets).

| Group | Pages |
| --- | --- |
| Sales and operations | Overview (`/admin`: MRR from active subscriptions with yearly ÷ 12, active subscriptions, open tickets, lead pipeline, recent invoices and activity) · Leads kanban (`/admin/leads`: drag and drop or a stage menu on each card; contact and audit forms create leads) · Clients (`/admin/clients`, plus a detail page with their projects, subscriptions, tickets and invoices) · Subscriptions · Projects · Tickets & requests · Invoices |
| Site CMS | Pages (`/admin/cms/home`, plus services, solutions, work, process, pricing, faq, blog and contact: hero copy and meta description) · Media (Supabase Storage) · Theme (accent colours, card radius → CSS variables) · Typography (hero and h2 max size, weight, tracking) · Menu · Site settings · Raw JSON (`/admin/cms/json`) |
| Content | Case studies · Blog (public `/blog` and `/blog/[slug]`, safe Markdown subset) · Testimonials · Plans · Add-ons (shown under plans on `/pricing`) |
| System | Audit log (every admin write; webhooks and form-created leads log as System) · Client portal |

Record pages share one engine: `lib/resources.ts` field configs → drawer form (`components/admin/RecordDialog.tsx`) → zod validation and audit in `app/admin/records.ts`. Structured CMS editors (`components/admin/ShapeEditor.tsx`) infer inputs from the JSON shape and save through `saveCmsPart`. Paid monthly plans create or extend a subscription in `lib/payments.ts`.

### Social sign-in (Google, LinkedIn, GitHub)

`/login` shows a "Continue with …" button only for providers switched on in Supabase (read from the public `/auth/v1/settings` endpoint, cached 5 minutes), so visitors never see an option that would fail. To switch one on:

1. Create an OAuth app with the provider (Google Cloud Console → OAuth client; LinkedIn Developers → "Sign In with LinkedIn using OpenID Connect"; GitHub → Developer settings → OAuth Apps). Use the callback URL `https://<project-ref>.supabase.co/auth/v1/callback`.
2. Supabase → Authentication → Sign In / Providers: enable it and paste the client ID and secret.
3. Supabase → Authentication → URL Configuration: add `http://localhost:3000/auth/callback` and `https://<your-domain>/auth/callback` to the redirect URLs.

Flow: `oauthSignIn` (server action, PKCE) → provider → `/auth/callback` exchanges the code for the session cookie → `next`. New accounts get a profile with the provider's name.

### Setup

1. **Supabase:** create a project, then run `supabase/migrations/*.sql` followed by `supabase/seed.sql` (SQL editor or `supabase db push`). Under Auth → URL configuration, add `https://<your-domain>/auth/callback`.
2. **Env:** copy `.env.example` → `.env.local` and fill in the Supabase URL, anon key and service-role key, plus the Stripe, Razorpay and Resend keys. Every service is optional: whatever is missing degrades gracefully (local content, a setup notice on `/login`, 503 from webhooks, logged emails).
3. **First admin:** sign up at `/login`, then run `update public.profiles set role = 'admin' where email = 'you@…';`.
4. **Stripe:** add a webhook endpoint `https://<domain>/api/webhooks/stripe` for `checkout.session.completed`; put its signing secret in `STRIPE_WEBHOOK_SECRET`.
5. **Razorpay:** add a webhook `https://<domain>/api/webhooks/razorpay` for `payment.captured` with a secret → `RAZORPAY_WEBHOOK_SECRET`.
6. Content edited under **/admin/cms/…** and prices in **/admin/content/plans** go live immediately (`revalidateTag("cms")`).

Checks: `node scripts/check-billing.mts` (signatures, replay, GST maths, region routing, open-redirect guard) and
`node scripts/platform-check.mjs` against a running server (proxy redirects, region cookie, webhook signature
accept/reject, pricing → checkout wiring).

## Pages

| Route | Contents |
|---|---|
| `/` | Cinematic overview: hero, marquee, services rail, solutions, 3 latest projects, showreel, process, stats, testimonials, pricing, 4 FAQs, CTA. Each preview links to its full page. |
| `/services` | Services rail (cards open detail pages), tools marquee, configurator, CTA |
| `/services/[id]` | 11 static pages (from `data/services.json`): tools, starting estimate + range (same math as the configurator), quote button, delivery process, other services |
| `/solutions` | Solutions, live analytics dashboard, growth funnel, stats |
| `/work` | All projects, showreel, testimonials |
| `/process` | Scroll-driven process timeline, tech stack |
| `/pricing` | Pricing tabs, configurator, FAQ |
| `/faq` | All questions (FAQPage JSON-LD lives here) |
| `/contact` | Start a project + free audit form |

Nav and footer links come from `data/site.json`. Links prefetch on hover/focus/touch (`components/ui/SmartLink.tsx`)
rather than when they scroll into view, which keeps load-time main-thread work low.

## Dark / light mode

The toggle is in the navbar (and the mobile menu). The first visit follows the OS setting; the choice is saved in
`localStorage` and applied by an inline script before first paint, so there's no flash. All colours are CSS
variables in `app/globals.css` (`:root` = dark, `html.light` = light), exposed to Tailwind as `bg`, `surface`,
`raised`, `line`, `fg`, `muted`, `accent`… In light mode the accent is a deeper lime (`#4D7C0F`) so lime text
and buttons keep ≥4.5:1 contrast. Areas that sit on video (hero, case media, showreel, process panel) use
`.theme-dark` and stay dark in both themes. Charts read the variables and redraw on toggle.

## Editing content

All copy is data. Edit the JSON and the page updates; there's no markup to touch.

- **Services, prices for the configurator:** `data/services.json` (`base` in ₹). Scope/timeline multipliers and
  defaults: `data/configurator.json`. The math (`sum(base) × scope × timeline`, rounded to ₹1,000; USD at
  `USD_RATE = 83`) and the plan recommendation live in `lib/pricing.ts`. Run `node scripts/check-pricing.mts`
  after changing them.
- **Work:** `data/cases.json`. Live projects (Viara Studios, ATHLEX) use `"video": false`, a screenshot
  `public/media/work-<slug>.jpg` (imported in `components/CaseStack.tsx`) and `tags`. Case studies with
  results use `"video": true` and `metrics`.
- **Pricing cards:** `data/pricing.json` (`india` / `intl`). **FAQ:** `data/faq.json`. **Testimonials:**
  `data/testimonials.json`. **Case studies:** `data/cases.json` (`slug` maps to `public/media/<slug>.*`).
- **Nav, footer, dashboard metrics, studio stats, client-login URL, email:** `data/site.json`.
- **Chart series:** `data/charts.json`. **Process / funnel / stack / solutions:** their own JSON files.
- **Icons:** data uses Material Symbols names; `components/ui/Icon.tsx` maps them to lucide icons. Add a
  mapping there if you introduce a new name.
- **Motion timings:** every duration/ease/stagger is in `lib/motion.ts`.

## Swapping video and images

See `public/media/README.md` for every file, its dimensions and size budget. Drop real files in with the
same names. Posters are imported statically, so `next/image` generates AVIF/WebP, sizes and blur placeholders
at build time. If a poster's aspect ratio changes, no code change is needed (all use `fill` + `object-cover`).
Update `alt` text in `data/cases.json` to describe the real images.

## Lead generation and CRM

Phases 1–3 of the lead platform (see `supabase/migrations/202610230*`). Database-first: isolation, consent and the
"no automatic email" rule are enforced by Postgres, not only by app code.

| Piece | Where |
|---|---|
| Schema: workspaces, members, companies, contacts, leads (existing table, extended), opportunities, activities, score history, consent records, suppression list, discovery jobs, outreach drafts, email events, automation runs, outbox | `supabase/migrations/20261023000000…030000_*.sql` |
| Row-level security: workspace roles (viewer reads, member writes, admin deletes, owner grants owner); platform admins see everything | same migrations, helper `private.has_workspace_role()` |
| Outreach guard: only workspace admins approve; editing approved content voids the approval; only the server can mark "sent", and only after approval | trigger `private.guard_outreach_transition()` |
| Inbound capture, atomic: company + contact dedupe, lead, score, timeline, enquiry consent, `lead.created` outbox event, audit | `public.crm_intake()` (service role only) ← `lib/crm/intake.ts` ← `lib/api.ts` (`/api/contact`, `/api/audit`) |
| Scoring rules-v1 (every point has a stored reason; ≥ 50 = MQL) | `lib/crm/scoring.ts` |
| Rate limiting for every site form (5 per IP per 10 min, 5 per email per hour), shared across instances, fails open | `lib/rate-limit.ts` → `public.rate_limit_hit()` |
| Retention purge (rate-limit buckets 1 day, delivered outbox 30 days, automation runs 180 days, email events and audit 2 years) | `public.crm_purge_expired()`: schedule daily with the service role |
| Typed data access | `lib/supabase/database.types.ts` (regenerate after every migration) |

**Tests**
- `npx tsx scripts/check-crm.mts`: scoring, normalisation, form handler (validation, honeypot, database-down path).
- `supabase/tests/crm_rls.sql` (27 checks) and `supabase/tests/crm_intake.sql` (15 checks): run in the Supabase SQL editor.
  They always end with an exception so nothing persists; the message reports the result.

**Deployment checklist (CRM)**
1. Apply migrations in order (`supabase db push`, or the SQL editor), then run both SQL test files: expect `0 failed`.
2. Regenerate `lib/supabase/database.types.ts` if the schema changed.
3. Vercel env: `SUPABASE_SERVICE_ROLE_KEY` (Sensitive, server-only) and optionally `IP_HASH_SECRET`. Never prefix either with `NEXT_PUBLIC_`.
4. Check `/api/health`: `public.ok` and `service.ok` must both be `true` and `projectRef` the intended project.
5. Submit one labelled test enquiry; confirm a lead, contact, consent row and `lead.created` outbox event; delete them.
6. Schedule `select public.crm_purge_expired();` daily (n8n or a cron) with the service role.
7. Supabase advisors: no new security findings. Turn on leaked-password protection (Auth settings).

**Not built yet (later phases):** admin CRM screens, n8n outbox delivery and signed webhooks, Reoon verification,
Gmail drafts and the approval queue UI, discovery imports, analytics. Each paid or external service needs approval first.

## Deploy (Vercel)

1. Push the repo and import it on Vercel (framework preset: Next.js, no custom build settings).
2. Add the env vars above in Project → Settings → Environment Variables.
3. Deploy. API routes run as Node serverless functions; `/media/*` is served with a 1-year immutable cache
   header (rename files when replacing them, or remove the header in `next.config.ts`).

## Motion and accessibility notes

- Lenis is driven by GSAP's ticker (one clock). All `#hash` links go through one handler in
  `components/Providers.tsx` that scrolls, corrects for late-rendering sections, and moves focus to the target.
- `prefers-reduced-motion`: Lenis, pins, SplitText, count-ups, parallax, the hero reel, autoplaying video and the
  preloader are all disabled; content renders statically. The CSS also zeroes transitions.
- Pinned/horizontal/sticky behaviours only run at ≥1024px; below that, sections are stacked with simple reveals.
- Landmarks, a single h1, skip link, visible focus, `aria-expanded`/`aria-controls` on menu + accordion,
  focus-trapped modals (Esc closes, focus returns), keyboard tabs (←/→/Home/End) and carousel (←/→, buttons,
  dots). Every looping video has a pause control and no audio.

## SEO

Metadata API (title, description, keywords, canonical, Open Graph, Twitter, robots/googleBot directives), a
generated OG image, `sitemap.xml`, `robots.txt`, `manifest.webmanifest`, icons, and one JSON-LD graph
(`lib/seo.ts`): ProfessionalService with a catalogue of services, WebSite, FAQPage (from `data/faq.json`) and an
ItemList of the live work. All of it is built from the data files, so it stays in sync with the page.

## Assumptions

1. **Logos:** the SVG logos in the prototype zip (`uploads/*.svg`) contain an empty `<image>` with no data, so
   they render blank. The site uses `assets/gravityy-mark-white.png` for the mark and `assets/favicon.png` as the
   favicon. Drop in a real SVG mark when one is available.
2. **Fonts:** Geist / Geist Mono (spec) replace the prototype's Sora / Inter / JetBrains Mono.
3. **Icons:** Material Symbols (an icon webfont) are replaced by tree-shaken lucide SVG icons; data keeps the
   original symbol names.
4. **Copy and data** are ported verbatim from `Gravityy Studio v2.dc.html`, including the dashboard metrics,
   chart series, studio stats and form messages. Sections are numbered (01–11) in the eyebrow labels.
5. **Added sections** per spec: a tool-wordmark Marquee after the hero (no third-party logo files were
   supplied, so tools are set as type) and a Showreel after Work.
6. **Media:** hero, showreel, ambient and case-study footage is from Pexels (sources in
   `public/media/README.md`), trimmed and graded darker for consistency. The four original case studies keep
   the prototype's results but now use stock footage that matches each sector; their `alt` texts describe the
   footage. Viara Studios and ATHLEX were added as the first two Work items, shown as live-site screenshots that
   link to the sites. Their cards list what was built (`tags`) instead of result metrics, because no verified
   numbers were supplied. Add `metrics` to their entries in `data/cases.json` when you have them.
7. **Hero LCP:** Chrome excludes full-viewport background images from LCP, so a full-bleed poster can't be the
   LCP element. The LCP is the hero subtext. It's painted at first paint (it rises in via transform but is never
   hidden), so video never gates LCP. The poster is the first visual; the reel fades in over it.
8. **Hero reel** (`components/HeroReel.tsx`) replaced the earlier WebGL knot (three.js removed entirely). Four
   clips (Pexels ×2, Pixabay ×2) crossfade on two stacked `<video>` layers. Playback starts after `load` + idle;
   only the current and next clip are ever loaded. Phones get 720×1280 portrait encodes (~0.1–1 MB each). The reel
   pauses off-screen or in a hidden tab, has a pause/play control, and under reduced motion downloads nothing
   until the visitor presses play. The reel is H.264-only (smallest file and hardware-decoded everywhere), so
   hero slots have no `.webm`.
9. **TechStack3D** is CSS 3D (layered planes, separating on scroll), not a second WebGL context. That meets the
   spec's "lightweight" requirement. The readable stack list sits beside it; the 3D stack is decorative.
10. **Framer Motion** handles the mobile menu and modal presence (lightweight `domAnimation`, loaded on idle).
    The carousel drag and pricing pill use pointer events / CSS (same 0.5s ease-in-out and 0.3s timings), which
    avoids ~50 KB of Framer's drag/layout features.
11. **Performance trade-offs (mobile):** below-fold sections use `content-visibility: auto` (Services, Work,
    Process only below 1024px, because they pin/stick on desktop). Each section is its own Suspense boundary for
    selective hydration. GSAP setups for far-off sections initialise only when near the viewport. Videos attach
    after `load` + idle; phones get a 720×1280 hero clip. The hero poster skips the blur placeholder (a
    full-viewport SVG blur was measurable main-thread cost). Pins use `pinType: "transform"`, so CLS stays 0 while
    scrolling. Per-section `next/dynamic` chunks were tried and measured slower (extra round-trips), then reverted.
12. **Lighthouse (mobile, simulated, local production build):** Performance 95–97, Accessibility 100,
    Best Practices 100, SEO 100 (FCP 1.2s, LCP 2.2s, TBT 150–200ms, CLS 0) whenever Chrome produces its first
    frame promptly (observed first paint ≈ 180ms, which a Playwright trace also shows consistently). In
    roughly half the runs on this Windows dev machine, the host delayed Chrome's first frame to ≈ 1.2s even
    unthrottled (background CPU load such as OneDrive sync). Lighthouse's simulation then charges hydration to
    LCP, and the score drops to 76–85 with LCP ≈ 3.5s. Accessibility, Best Practices and SEO were 100 in every
    run. Verify on the Vercel deployment with PageSpeed Insights for the authoritative number.
13. **Client Login** has no URL in the prototype; it points to `#` and is configurable as `clientLoginHref` in
    `data/site.json`.
14. **Forms:** zod schemas in `lib/schemas.ts` are shared by client (loaded lazily on first submit) and server.
    The honeypot field is `website`; a filled honeypot gets a normal-looking success response and nothing is sent.
    There is no rate limiting. Add Vercel WAF / Upstash if spam appears.
15. **Accent use:** lime is reserved for one emphasis per viewport (hero "WE AUTOMATE.", the configurator CTA,
    the Grow plan, the CTA headline's second line). Standard primary buttons are off-white.
16. **Custom cursor** hides the native cursor only on links/buttons/body for fine pointers; text fields keep the
    native caret. Hidden entirely on touch.
17. **Versions:** Next 15.5 and Tailwind 3.4 are pinned (Tailwind 3 matches the spec's `tailwind.config.ts`
    token file; Next 15 for stable `next/font` Geist + `experimental.inlineCss`). `npm run lint` uses the ESLint
    CLI (flat config).
18. The process section pins only when the viewport is ≥1024px wide **and** ≥700px tall (8 steps need the height).
19. **Platform scope:** the Grow plan is monthly, but checkout collects the first month as a one-time payment;
    automatic renewals (Stripe/Razorpay subscriptions), refunds and credit notes are not built yet. Invoice numbers
    are a Postgres identity sequence. Unknown visitor country (e.g. localhost) defaults to India/INR. If the amount
    a provider reports differs from the plan total, the invoice records what was actually paid and logs a warning.
20. **Portal/Admin UI** was verified to build, type-check and guard correctly (signed-out redirects, RBAC); its
    data views need a configured Supabase project to render with real rows.
