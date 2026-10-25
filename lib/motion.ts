// Central motion config. Every duration/ease in the app comes from here.
export const MOTION = {
  ease: { out: "power3.out", inOut: "power2.inOut", expo: "expo.out" },
  dur: {
    preloader: 0.7,
    heroLine: 0.8,
    heading: 0.9,
    card: 0.8,
    count: 0.8,
    analytics: 1.0,
    carousel: 0.5,
    tab: 0.3,
    faq: 0.4,
    button: 0.2,
    funnelBar: 0.7,
  },
  stagger: { hero: 0.12, lines: 0.08, cards: 0.08, funnel: 0.1 },
} as const;

/** Framer Motion transition for UI state (menu, modals). */
export const FM = {
  panel: { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const },
};

export const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";
export const MOTION_OK = "(prefers-reduced-motion: no-preference)";
export const DESKTOP = "(min-width: 1024px)";

export function prefersReduced() {
  return typeof window !== "undefined" && window.matchMedia(REDUCED_QUERY).matches;
}
