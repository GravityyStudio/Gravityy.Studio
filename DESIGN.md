---
version: 3
name: Gravityy-Studio
description: "Award-style dark studio site. Near-black ground (#0A0A0A / #000 / #111), warm off-white ink (#f5f5f2), one electric lime (#cdfb50) for actions, and a purple glow (rgba(189,108,247)) used only as light behind sections. Manrope Variable throughout; display headings uppercase at poster scale. Cards and pills are drawn with inset hairlines. Motion is a set of ten named signatures, all transform/opacity, all off under reduced motion."

# Source of truth: app/tokens.css (every value below), app/globals.css (utilities), tailwind.config.ts (maps tokens to
# classes), lib/theme.ts (CMS overrides for accent + radius). The home page (components/home/*) is the reference build.

colors:
  base: "#0A0A0A"            # --bg, page ground (painted on <html> so the glow layer shows through <body>)
  sunken: "#000000"          # --sunken
  strong: "#111111"          # --surface, cards and panels
  raised: "#1A1A1A"          # --raised, idle controls
  ink: "#f5f5f2"             # --fg
  ink-muted: "#929292"       # --muted, secondary text only (≥4.5:1 on base)
  accent: "#cdfb50"          # --accent, lime (CMS: Theme → accentDark)
  on-accent: "#0A0A0A"
  glow: "rgba(189,108,247)"  # --glow, light only, never a surface
  hairline: "rgba(255,255,255,0.08)"  # --hairline, inset 1px borders
  danger: "#ff9c8a"

typography:
  family: "Manrope Variable (next/font, --font-sans)"
  base: "17.66px / 27.38px"
  display: "uppercase, weight 650, tracking -0.04em, leading 0.95, clamp(40px, 7vw, 120px) — class .display"
  section-display: "clamp(36px, 5vw, 80px) for section titles that use .display"
  small: 15px                # captions, legends, meta (13px legal only)
  case: "display headings uppercase; everything else sentence case"

rounded:
  sm: 18px
  md: 22px                   # cards (--radius-card, CMS-overridable)
  lg: 30px
  xl: 32px                   # large panels
  pill: 999px                # buttons, toggles, nav pill

motion:
  ease: "cubic-bezier(.22,1,.36,1) (--ease) / expo.out in GSAP"
  durations: "200 / 400 / 600 / 900ms (--dur-1..4)"
  properties: "transform and opacity only (plus a 10px blur on line reveals)"
  reduced-motion: "every signature below is off; content is complete and static"

spacing:
  container: 1280px
  gutter: "16px / 24px (sm) / 32px (lg)"
  section: "clamp(80px, 11vh, 140px) top and bottom"
  touch-min: 44px
---

## Overview

Gravityy Studio designs, builds and automates websites, apps and the systems behind them. v3 is a dark, award-style
site: big uppercase type, a lime that only ever means "act", and a purple glow that drifts in behind sections as you
read. Every claim on the page is either real (confirmed by the owner) or a visible `{{PLACEHOLDER}}`.

## Colour

- **Lime** marks actions: the primary button, focus rings, the selected segment, the cursor dot, the rail dot, the
  footer ball. Never a decorative fill.
- **Glow** is light, not paint. One fixed layer (`ScrollChoreo`) fades up while a `[data-glow]` section holds the
  viewport centre, and fades back to black between them.
- **Surfaces** step #000 → #0A0A0A → #111 and are outlined with the inset hairline (`.card`, `.hairline`), never with
  outer borders or drop shadows.
- Dark only. The light theme and theme toggle were removed in v3.

## Typography

`.display` is the only headline style: uppercase, 650, -0.04em, leading 0.95. Body text is 17.66/27.38 in full ink;
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

## Motion: the ten signatures

| # | Signature | Where |
|---|---|---|
| 1 | Nav morphs from a bar to a pill, plus a full-screen menu | `Navbar.tsx` |
| 2 | Cursor accent dot with a dotted trail; grows into a ring over interactive elements (fine pointers only) | `CustomCursor.tsx` |
| 3 | Scroll choreography: glow crossfade, line reveal (translateY + blur), panels scale in from 0.94 | `motion/ScrollChoreo.tsx` |
| 4 | Service rows with rolling text and a rotating arrow | `home/ServiceRows.tsx` |
| 5 | Node network: SVG paths draw in on scroll into a "Your product" hub | `home/NodeNetwork.tsx` |
| 6 | Pricing configurator: sliding segment indicator and animated price count | `home/HomePricing.tsx` |
| 7 | Case cards with a hover reel and count-up metrics | `home/WorkCards.tsx`, `ui/Counter.tsx` |
| 8 | Left scroll-progress rail (lg+) | `motion/ScrollRail.tsx` |
| 9 | Footer giant wordmark with a bouncing lime ball (spring physics) | `FooterWordmark.tsx` |
| 10 | Reduced motion disables everything above | `lib/motion.ts` (`MOTION_OK`), `gsap.matchMedia` |

Rules:
- Content is never hidden in CSS. Hidden start states are set by script, so the page is complete without JS and
  under reduced motion.
- First-screen text uses `.home-rise`, a transform-only entrance, so LCP isn't held back by an opacity fade.
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
