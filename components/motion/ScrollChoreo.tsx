"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { DESKTOP, MOTION_OK, REDUCED_QUERY } from "@/lib/motion";
import { onNear } from "@/lib/onNear";

/**
 * Page-wide scroll choreography, re-run on every route:
 * - [data-glow] sections cross-fade the page from black to the purple section gradient (#2a0f6b → #5b2bd1 → #000)
 *   while they hold the viewport centre, and back to black between them.
 * - [data-reveal] headings reveal line by line: rising from 0.6em below and a 12px blur to clear (phones and tablets
 *   skip the blur: a filter on every line costs frames on mid-range phones).
 * - [data-panel] elements scale in from 0.96 with a fade.
 * Opacity, transform and a short blur only. Under reduced motion panels only fade (no movement, blur or splitting).
 * Headlines are split only as they near the viewport, so far-off sections cost nothing at load.
 */
export default function ScrollChoreo() {
  const glow = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useGSAP(
    (_, contextSafe) => {
      const stops: (() => void)[] = [];
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.set(glow.current, { opacity: 0 });
        gsap.utils.toArray<HTMLElement>("[data-glow]").forEach((el) =>
          ScrollTrigger.create({
            trigger: el,
            start: "top 60%",
            end: "bottom 40%",
            onToggle: (self) => gsap.to(glow.current, { opacity: self.isActive ? 1 : 0, duration: 0.9, ease: "power2.out", overwrite: true }),
          }),
        );

        const blur = window.matchMedia(DESKTOP).matches ? { filter: "blur(12px)" } : {};
        const reveal = contextSafe!((el: HTMLElement) => {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 60,
                opacity: 0,
                ...blur,
                duration: 0.9,
                ease: "expo.out",
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: "top 85%", once: true },
              }),
          });
        });
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => stops.push(onNear(el, () => reveal(el))));

        gsap.utils
          .toArray<HTMLElement>("[data-panel]")
          .forEach((el) =>
            gsap.from(el, {
              scale: 0.96,
              opacity: 0,
              duration: 0.9,
              ease: "expo.out",
              clearProps: "transform,opacity",
              scrollTrigger: { trigger: el, start: "top 88%", once: true },
            }),
          );
      });
      // Reduced motion: keep a plain fade for panels, nothing else.
      mm.add(REDUCED_QUERY, () => {
        gsap.utils
          .toArray<HTMLElement>("[data-panel]")
          .forEach((el) => gsap.from(el, { opacity: 0, duration: 0.4, clearProps: "opacity", scrollTrigger: { trigger: el, start: "top 92%", once: true } }));
      });
      return () => {
        stops.forEach((stop) => stop());
        mm.revert();
      };
    },
    { dependencies: [path], revertOnUpdate: true },
  );

  return (
    <div
      ref={glow}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-0"
      // taste-skill-ignore: the glow is the brief's signature light, drawn behind content only
      style={{
        background:
          "radial-gradient(70% 55% at 72% 30%, rgb(var(--glow) / 0.22), transparent 70%), linear-gradient(180deg, rgb(var(--grad-1) / 0.55) 0%, rgb(var(--grad-2) / 0.35) 45%, rgb(0 0 0) 100%)",
      }}
    />
  );
}
