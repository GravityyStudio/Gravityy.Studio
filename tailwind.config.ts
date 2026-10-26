import type { Config } from "tailwindcss";
import plugin from "tailwindcss/plugin";

// Every colour is a CSS variable (RGB triplet) defined in app/tokens.css. `<alpha-value>` keeps opacity modifiers like `text-fg/60` working.
const v = (name: string) => `rgb(var(--${name}) / <alpha-value>)`;

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    screens: { sm: "640px", md: "768px", lg: "1024px", xl: "1280px", "2xl": "1536px" },
    extend: {
      colors: {
        bg: v("bg"),
        surface: { DEFAULT: v("surface"), 2: v("surface-2") },
        raised: v("raised"),
        sunken: v("sunken"),
        line: { DEFAULT: v("line"), strong: v("line-strong") },
        fg: v("fg"),
        muted: v("muted"),
        accent: v("accent"),
        hi: v("hi"),
        danger: v("danger"),
        glow: v("glow"),
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "monospace"],
      },
      fontSize: {
        // Max size, weight and tracking are CMS-driven (Site CMS → Typography → CSS vars in app/layout.tsx).
        hero: ["clamp(44px, 9vw, var(--hero-max, 140px))", { lineHeight: "0.92", letterSpacing: "var(--tracking, -0.04em)", fontWeight: "var(--hero-weight, 600)" }],
        h2: ["clamp(34px, 5.2vw, var(--h2-max, 72px))", { lineHeight: "1.02", letterSpacing: "var(--tracking, -0.04em)", fontWeight: "var(--h2-weight, 500)" }],
        stat: ["clamp(56px, 7vw, 96px)", { lineHeight: "1", letterSpacing: "-0.04em" }],
      },
      maxWidth: { container: "1280px" },
      borderRadius: { card: "var(--radius-card, 22px)", sm: "var(--r-sm)", md: "var(--r-md)", lg: "var(--r-lg)", xl: "var(--r-xl)", pill: "var(--r-pill)" },
      // 8pt rhythm: 56px (mobile) → 96px (desktop) per side, so sections sit 112–192px apart.
      spacing: { section: "clamp(56px, 6vw, 96px)" },
    },
  },
  plugins: [plugin(({ addVariant }) => addVariant("light", "html.light &"))],
} satisfies Config;
