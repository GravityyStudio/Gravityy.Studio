---
version: 2
name: Gravityy-Studio
description: "A near-black studio canvas (#0a0a0a) with warm off-white ink (#f5f5f2) and one electric lime (#a8f01e), used as a whole field once and otherwise only on actions. Type does the work: Geist at poster scale with tight tracking, very few sizes, no labels or numbering. Sections are chapters of flat colour (dark, paper, lime) separated by tone, never by lines, shadows or glass. The idea comes from the name: gravity. The hero statement lands across a seam into the lime field. Motion is quiet: entrances on scroll, one moving picture, a bar that takes the colour of the chapter beneath it."

# Source of truth: app/globals.css (tokens + chapters), tailwind.config.ts (scales), lib/motion.ts (motion),
# lib/theme.ts (CMS overrides). The home page (components/home/*) is the reference implementation of this system.

colors:
  # dark (default)
  canvas: "#0a0a0a"          # --bg
  surface: "#111111"         # --surface (alternate chapters)
  surface-2: "#141414"
  raised: "#171717"          # inset controls, idle toggles
  sunken: "#050505"
  ink: "#f5f5f2"             # --fg
  ink-muted: "#a3a3a3"       # --muted
  accent: "#a8f01e"          # --accent, lime (CMS: accentDark)
  on-accent: "#0a0a0a"
  danger: "#ff9c8a"
  light:
    canvas: "#fafaf7"
    surface: "#f2f2ed"
    ink: "#0e0e0e"
    ink-muted: "#565652"
    accent: "#4d7c0f"        # deep lime, ≥4.5:1 as text (CMS: accentLight)
    danger: "#b91c1c"
  chapters:
    paper: "inverts the current theme (.chapter-paper): #f5f5f2 ground / #0e0e0e ink in dark mode"
    accent: "lime field (.chapter-accent): #a8f01e ground / #0a0a0a ink; olive #4d7c0f / #fafaf7 in light mode"

typography:
  family: "Geist (next/font) for everything. Geist Mono only for literal code."
  scale:                      # the whole page uses these steps and nothing else
    small: 15px               # captions, legends, sign-offs (13px for legal lines only)
    body: 17px                # leading 1.55-1.65, max 60ch
    lead: 20px                # hero sentence, included-features list, footer intro
    statement: 32px           # quotes, the audit sentence (20px on phones), ≤3 lines
    heading: "clamp(28px, 3vw, 40px)"      # section titles, project titles
    display: "clamp(40px, 5.2vw, 84px)"    # set pieces: services list, process lines, reel, CTA (9vw on phones)
    hero: "clamp(88px, 10vw, 160px)"       # the statement (15vw on phones), weight 600, leading 0.86
    price: "clamp(84px, 14vw, 224px)"      # the live price figure only
  tracking: "-0.03em headings, -0.045em display, -0.05em hero; never positive"
  case: "sentence case everywhere"

rounded:
  pill: 9999px     # every button, toggle and tab
  field: 16px      # inputs, the audit sentence's blanks
  thumb: 6px       # small project thumbnails
  media: 0         # large pictures and video stay square

spacing:
  container: 1280px
  gutter: "16px / 24px (sm) / 32px (lg) — the same pair of margins everywhere"
  section: "96-200px top and bottom (clamp by viewport height); larger than any gap inside a section"
  touch-min: 44px

motion:
  ease: "power3.out (GSAP) / cubic-bezier(0.22, 1, 0.36, 1) (CSS)"
  entrance: "[data-enter] rises 24px + fades, 0.8s, 70ms apart, once at 85% of the viewport (hooks/useEnter.ts)"
  hero: "statement fades in (0.6s delay); sentence rises 0.35em"
  signature: "colour by chapter: the fixed bar takes the field of the section beneath it (300ms)"
  picture: "showreel loop with a slow ±6% scroll drift"
  feedback: "buttons scale 1.03 / 0.98 in place; links change underline colour; arrows nudge 2-4px"
  reduced-motion: "no entrances, drift or swaps; everything visible and static"
---

## Overview

Gravityy Studio designs, builds and automates websites, apps and the systems behind them. The site reads like a studio
with a point of view, not a template. Its idea comes from the name: **gravity**. The home hero is two flat fields, dark
above and lime below, and the statement *Products that land.* sits across the seam. Its second line has landed in the
lime and changes ink where it crosses.

Everything else follows from three decisions:

1. **Type carries the page.** A few sizes, far apart. Capabilities, process steps and the price are set at poster
   scale, and the lists are the pictures.
2. **Colour comes in whole fields.** Sections are chapters on dark, a one-step-lighter surface, inverted paper, or
   (once) lime. Surfaces are told apart by tone. There are no hairlines, outlines, shadows, glass or gradients.
3. **Nothing ornamental.** No eyebrow labels, no 01/02 numbering, no mono captions, no icon cards, no glow, no grain.
   Where an ornament used to be there is a larger thing, the full content, or a real picture.

## Colour

- **Lime** is the action colour: the accent button, focus rings, selection, link underline on hover, the last process
  step. As a whole field it appears once, in the hero's lower half.
- **Ink** is used at full strength for running text; muted ink only for secondary notes (descriptions beside a list,
  sign-offs, legends).
- **Chapters**: `.chapter-paper` inverts the theme for one section (the services list, the footer);
  `.chapter-accent` is the lime field. Both swap the colour variables, so every token-based class inside them keeps
  working, and both mark themselves `data-chapter` so the navigation bar can follow them.
- Light theme is first-class: the same structure with the paper/dark roles swapped and the deep olive lime.

## Typography

Use the scale above and nothing in between; map any new size onto the nearest step. Headlines and every heading stay
within **two lines at every width**: cut words before shrinking type. Statements (a quote, the audit sentence) are
paragraphs, at most 32px and three lines. Body text is 17px in full ink.

## Layout

- One pair of equal outer margins (`.container-x`). Nothing bleeds on one side only.
- Asymmetry lives inside the 12-column grid: the process lines step two columns right per line; work pairs a 7-column
  visual with a 4-column cluster; headings sit in columns 1-3 against content from column 5.
- Each section has a different composition from its neighbours. A section always opens with a heading that names it.
- Phones get their own composition: the staircase becomes an indent, pricing shows the price before the choices, the
  services list stacks name over description.

## Components

- **Navigation**: a plain full-width bar with the wordmark, up to five links, Client login and one "Start a project" button.
  The phone version shows the mark, the button and a "Menu" word. It takes the colour of the chapter beneath it.
- **Buttons** (`components/ui/Button.tsx`): pills, 48px (44px in the bar). Use `accent` for the one conversion per
  view, `primary` (ink) for neutral strong actions and `ghost` for secondary ones.
- **Choices**: native radio inputs styled as pills (selected = ink fill), grouped in a `fieldset` with a legend.
- **Forms**: the audit is a sentence with blanks (inputs inline at `1.35em`, field radius). Errors are announced in a
  `role="status"` line.
- **Pictures**: real screenshots of client sites and the project clips; large, square-cornered, with poster frames on
  every video. Text never sits on a picture except over a neutral scrim (the reel caption).
- **Footer**: an inverted paper chapter. Plain columns sit above, the newsletter on the left, and the name is set edge
  to edge below.

## Motion

Use only transform and opacity, and give each move one purpose:
- **Entrances:** sections enter as they are read.
- **Navigation bar:** it follows the chapter beneath it.
- **Moving picture:** the reel drifts with the scroll.
- **Controls:** they answer a press in place.

Content is never hidden in CSS. Hidden states are set by script, so the page is complete without JavaScript and
with reduced motion. Anything already on screen when a section sets up simply shows.

## Do's and don'ts

### Do
- Make the main thing larger before adding anything else.
- Use the type steps, the chapter classes and the token utilities (`bg-bg`, `text-muted`, `text-accent`).
- Write the full content: every price, every answer, every real result. Only show proof the owner has confirmed.
- Check both themes and 390 / 768 / 1440px, with `node .claude/skills/design-taste-frontend/scripts/inspect.mjs <url>`.

### Don't
- Don't add labels above headings, index numbers, monospace captions or uppercase tracked text.
- Don't separate things with hairlines, outlined boxes, shadows, glass, glows, grain or gradients.
- Don't add a second accent colour, or use lime as decoration.
- Don't add icon-topped card grids or rows of identical cards.
- Don't add sizes between the steps, set headings past two lines, or set body text in grey.
- Don't let a picture bleed on one side only, or put text over a picture without a neutral scrim.
