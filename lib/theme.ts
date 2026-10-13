export const THEME_KEY = "theme";

/** Inline, render-blocking snippet for <head>: saved choice → OS preference → dark. Prevents a flash of the wrong theme. */
export const THEME_SCRIPT = `document.documentElement.classList.add('js');try{var t=localStorage.getItem('${THEME_KEY}');if(t!=='light'&&t!=='dark')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.classList.add(t)}catch(e){document.documentElement.classList.add('dark')}`;

type Theme = { accentDark?: string; accentLight?: string; radius?: number };
type Typography = { heroMax?: number; h2Max?: number; heroWeight?: number; h2Weight?: number; tracking?: number };

const rgb = (hex: unknown, fallback: string) =>
  typeof hex === "string" && /^#[0-9a-f]{6}$/i.test(hex) ? [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ") : fallback;
const num = (v: unknown, min: number, max: number, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback);

/**
 * CMS theme + typography → CSS custom properties (injected in <head>). Every value is validated/clamped, so a bad
 * CMS entry can't inject CSS. Selectors out-rank globals.css (`html:root` > `:root`) regardless of stylesheet order.
 */
export function tokenCss(theme: Theme, t: Typography) {
  const dark = rgb(theme.accentDark, "168 240 30");
  return [
    `html:root,html .theme-dark{--accent:${dark}}`,
    `html.light:root{--accent:${rgb(theme.accentLight, "77 124 15")}}`,
    `html:root{--radius-card:${num(theme.radius, 0, 48, 24)}px;--hero-max:${num(t.heroMax, 48, 220, 140)}px;--h2-max:${num(t.h2Max, 32, 120, 72)}px;` +
      `--hero-weight:${Math.round(num(t.heroWeight, 100, 900, 600))};--h2-weight:${Math.round(num(t.h2Weight, 100, 900, 500))};--tracking:${num(t.tracking, -0.1, 0.1, -0.04)}em}`,
  ].join("");
}
