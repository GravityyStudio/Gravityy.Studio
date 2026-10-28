---
version: 4
name: Gravityy-Studio
description: "Award-style dark studio site. Black ground (#000 / #111), warm off-white ink (#f5f5f2), one electric lime (#cdfb50) for actions, and a purple glow (rgba(189,108,247)) used only as light behind sections. Funnel Sans throughout (JetBrains Mono for small labels); display headings in sentence case, 56/56, weight 400. Cards and pills are drawn with inset hairlines. Motion is a set of ten named signatures, all transform/opacity, all off under reduced motion."

# Source of truth: app/tokens.css (every value below), app/globals.css (utilities), tailwind.config.ts (maps tokens to
# classes), lib/theme.ts (CMS overrides for accent + radius). The home page (components/home/*) is the reference build.

colors:
  base: "#000000"            # --bg, surface.base (painted on <html> so the glow layer shows through <body>)
  strong: "#111111"          # --surface, cards and panels
  raised: "#1A1A1A"          # --raised, idle controls
  ink: "#f5f5f2"             # --fg
  ink-muted: "#929292"       # --muted, text.secondary (≥4.5:1 on base)
  ink-soft: "#c9c2da"        # --soft, text on the purple gradient
  accent: "#cdfb50"          # --accent, lime (CMS: Theme → accentDark)
  on-accent: "#080808"       # --on-accent, text on lime
  gradient: "#2a0f6b → #5b2bd1 → #000"  # --grad-1 / --grad-2, glow sections
  glow: "rgba(189,108,247)"  # --glow, light only, never a surface
  hairline: "rgba(255,255,255,0.08)"  # --hairline, inset 1px borders
  danger: "#ff9c8a"

typography:
  family: "Funnel Sans (variable, next/font, --font-sans) for all text; JetBrains Mono (variable, --font-mono) for small labels and code"
  base: "16px / 26px"
  display: "Funnel Sans 400, sentence case, 56px / 56px (line-height 1), letter-spacing -0.01em (-0.56px), #fff; clamp(36px, 5vw, 56px) — class .display"
  section-display: "clamp(30px, 4vw, 56px) for section titles that use .display"
  scale: "11 / 12 / 12.48 / 13 / 14 / 17.66 / 20.32 / 23.84px (Tailwind text-t-11 … text-t-24)"
  small: 15px                # captions, legends, meta (13px legal only)
  case: "sentence case everywhere"

rounded:
  sm: 18px
  md: 22px                   # cards (--radius-card, CMS-overridable)
  lg: 30px
  xl: 32px                   # large panels
  2xl: 50px
  pill: 999px                # buttons, toggles, nav pill

motion:
  ease: "cubic-bezier(.22,1,.36,1) (--ease) / expo.out in GSAP"
  durations: "200 / 250 / 350 / 400 / 700 / 900ms (--dur-1..6)"
  properties: "transform and opacity only (plus a 10px blur on line reveals)"
  reduced-motion: "every signature below is off; content is complete and static"

shadows:
  hairline: "inset 0 0 0 1px rgba(245,245,242,.08)"
  accent: "0 0 22px rgba(205,251,80,.2)"
  glow-card: "inset 0 0 0 1px rgba(189,108,247,.35), 0 30px 60px -30px rgba(0,0,0,.8)"
  panel: "inset 0 0 0 1px rgba(245,245,242,.1), 0 30px 80px -30px rgba(0,0,0,.9)"

spacing:
  components: "8 / 12 / 14 / 16 / 19.2 / 20 / 22.4 / 24px (--s-1..8)"
  sections: "32 / 48 / 64 / 96 / 160px"
  container: 1280px
  gutter: "16px / 24px (sm) / 32px (lg)"
  section: "clamp(56px, 8vh, 96px) top and bottom"
  touch-min: 44px
---

## Overview

Gravityy Studio designs, builds and automates websites, apps and the systems behind them. v3 is a dark, award-style
site: large, light sentence-case type, a lime that only ever means "act", and a purple glow that drifts in behind sections as you
read. Every claim on the page is either real (confirmed by the owner) or a visible `{{PLACEHOLDER}}`.

## Colour

- **Lime** marks actions: the primary button, focus rings, the selected segment, the cursor dot, the rail dot, the
  footer ball. Never a decorative fill.
- **Glow** is light, not paint. One fixed layer (`ScrollChoreo`) carries the purple section gradient and fades up while
  a `[data-glow]` section holds the viewport centre, and back to black between them.
- **Retheming** changes only `--accent` and `--glow` (plus the two gradient stops). The bottom-left theme button cycles
  three presets (Lime, Ember, Ice) defined in `app/tokens.css`.
- **Surfaces** step #000 → #111 and are outlined with the inset hairline (`.card`, `.hairline`), never with
  outer borders or drop shadows.
- Dark only. The light theme and theme toggle were removed in v3.

## Typography

`.display` is the only headline style: Funnel Sans 400, 56/56, -0.01em, white, sentence case. Body and UI text use normal letter spacing. Body text is 16/26 in full ink;
muted ink is for secondary lines only. Keep headlines to two or three lines at every width. Cut words before
shrinking type. First-screen widths are set in `rem`, not `ch`, so the font swap doesn't shift layout.

## Components

All components have default, hover, focus-visible, active, disabled and loading states where they apply. Targets are
at least 44px.

- **Navbar** (`components/Navbar.tsx`): a full bar at the top on desktop morphs into a floating pill once scrolled.
  The hidden half is `inert`. "Menu" opens a full-screen menu (`aria-expanded`, `aria-controls="site-menu"`, Esc
  closes, focus returns).
- **Button** (`components/ui/Button.tsx`): pill. `accent` is the one conversion per view, `primary` is ink, and
  `ghost` is the hairline variant. `loading` shows a spinner and sets `aria-busy`.
- **Segmented control** (`HomePricing`): native radios in a `fieldset` with a sliding lime indicator. It switches
  One-time build / Monthly grow and INR ₹ / USD $.
- **Accordion** (`HomeFaq`): a button with `aria-expanded`/`aria-controls`, a panel with `role="region"` (`hidden`
  when closed), and a plus icon that rotates.
- **Audit form** (`components/AuditForm.tsx`): URL then email, labelled. Errors appear inline under the field via
  `aria-describedby` and focus moves to the first invalid field. A server error shows in a status line. Success is
  "Request received." with a way to send another.
- **Cards**: work cards with a count-up metric and hover reel; testimonial cards; dashed cards for placeholders.
- **Utility chips** (`components/UtilityChips.tsx`): Sound is a toggle button with `aria-pressed`; the theme button
  names the current preset in its label. 44px circles on phones, labelled pills from 640px.
- **Case study** (`app/work/[slug]/page.tsx`): hero, key picture, facts (sector, scope, results), brief / approach /
  outcome, next project. Missing write-ups render as labelled placeholders.

Every interactive component covers default, hover, focus-visible (lime ring), active, disabled, loading and error
where they apply. Keyboard: Tab order follows reading order, Enter/Space activate, arrows move within radio groups,
Esc closes the menu and modals. Pointer: hover states only on devices that hover. Touch: no hover dependence, tap
ripple feedback, 44px targets.

## Motion: the signatures

| # | Signature | Where |
|---|---|---|
| 1 | Nav: full bar (logo, links with Services/Work dropdowns, language pill, client login or Dashboard + avatar when signed in, lime CTA) morphs after 80px of scrolling down into a floating centred blurred pill (logo mark, CTA, two-line burger) and expands on scroll up; full-screen menu with staggered links | `Navbar.tsx` |
| 2 | Cursor: 10px accent dot (lerp 0.15) with 8 fading trail dots, ring over links and buttons; fine pointers only. Touch gets a tap ripple | `CustomCursor.tsx` |
| 3 | Scroll choreography: black ↔ purple gradient crossfade, line reveal (translateY + 12px blur, no blur below 1024px), panels scale from 0.96. One pinned section (node network, desktop) | `motion/ScrollChoreo.tsx`, `home/NodeNetwork.tsx` |
| 4 | Service rows: rolling duplicate text, arrow rotates -45° (no divider lines) | `home/ServiceRows.tsx` |
| 5 | Node network: "Your product" glowing pill, curves draw on scroll, pills float, hover lights a connection | `home/NodeNetwork.tsx` |
| 6 | UI mock panel: skeleton lines and two chips, a lime outline cycles between them | `home/MockPanel.tsx` |
| 7 | Pricing configurator: sliding segment indicator, animated price count, INR/USD flip, live feature list | `home/HomePricing.tsx` |
| 8 | Case cards: hover reel, count-up metrics | `home/WorkCards.tsx`, `ui/Counter.tsx` |
| 9 | Left scroll-progress rail with ticks and a lime dot (lg+) | `motion/ScrollRail.tsx` |
| 10 | Footer: giant wordmark, bouncing lime ball (spring physics), tilted label, glow, link columns, social pills, audit form | `Footer.tsx`, `FooterWordmark.tsx` |
| 11 | Utility chips: bottom-right Sound off/on (off by default, remembered), bottom-left theme button | `UtilityChips.tsx` |
| 14 | Testimonial slider (scroll-snap, arrows, swipe) and team grid (staggered portraits, monochrome to colour on hover) | `home/Testimonials.tsx`, `home/Team.tsx` |
| 12 | Reduced motion: no Lenis, cursor, trail, pin, float, loops or line splitting; panels keep a plain fade | `lib/motion.ts`, `gsap.matchMedia` |

Cards and app motion:
- **Work / project cards** (`components/work/WorkCard.tsx`, `WorkGrid.tsx`): Framer spring tilt toward the cursor,
  lift + glow on hover, hover reel, count-up metrics, stretched link to the case study. `/work` adds type filters
  (`aria-pressed` chips, sliding accent pill, layout reflow). Used on home, /work, /solutions and inner pages.
- **Service, blog and dashboard cards**: `.spotlight` (an accent light follows the pointer; one listener in Providers)
  and `.card-lift` (lift, glow, press-in).
- **Page transitions** (`app/template.tsx`): every client-side navigation fades and rises in; the landing page is never
  hidden (LCP-safe). Covers the site, the portal and the admin.
- **Portal / admin**: sliding active pill in the sidebar and tabs (Framer shared layout), stat tiles count up, table
  rows and lists rise in one after another (`.stagger`), progress and pipeline bars grow from the left (`.bar-grow`).
- **Smooth scroll**: Lenis (lerp 0.085) on the GSAP ticker for wheel input; touch keeps native momentum; off under
  reduced motion. Framer follows the OS setting through `MotionConfig reducedMotion="user"`.

Rules:
- Content is never hidden in CSS. Hidden start states are set by script, so the page is complete without JS and
  under reduced motion.
- First-screen text uses `.home-rise`, a transform-only entrance, so LCP isn't held back by an opacity fade.
- Phones get simplified scroll effects: no blur on reveals, no pin, no float/loop animations, no backdrop blur on the
  chips. Measured: the blur filter was the biggest per-frame cost on a throttled phone.
- Headlines split into lines only as they near the viewport (`onNear`), so sections far down the page cost nothing at
  load.

## Accessibility

- WCAG 2.2 AA: muted #929292 on #0A0A0A passes for body text, and lime is used on dark only or behind dark ink.
- Visible lime focus ring on every control, plus a skip link.
- Hidden nav and menu states are `inert`; decorative layers are `aria-hidden`.
- Every image needs real alt text. Placeholders describe what belongs there.

## Do / Don't

**Do:** use the tokens and utilities (`.display`, `.card`, `.hairline`, `bg-surface`, `text-muted`, `rounded-pill`).
Show only confirmed proof. Check 360 / 390 / 768 / 1440 / 1920px with
`node .claude/skills/design-taste-frontend/scripts/inspect.mjs <url>`.

**Don't:** invent metrics, logos, testimonials or people (use `{{PLACEHOLDER}}`). Don't add a second accent. Don't use
glow as a fill. Don't animate layout properties. Don't add `meta keywords`.
