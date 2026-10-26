"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger, SplitText, useGSAP } from "@/lib/gsap";
import { MOTION_OK } from "@/lib/motion";

/**
 * Page-wide scroll choreography, re-run on every route:
 * - [data-glow] sections cross-fade the fixed purple glow in (black → glow → black) while they hold the viewport centre.
 * - [data-reveal] headings reveal line by line: rising from 0.6em below and a 10px blur to clear.
 * - [data-panel] elements scale in from 0.94 with a fade.
 * Opacity, transform and a short blur only. Nothing runs under reduced motion, so everything stays visible and static.
 */
export default function ScrollChoreo() {
  const glow = useRef<HTMLDivElement>(null);
  const path = usePathname();

  useGSAP(
    () => {
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

        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
          SplitText.create(el, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 60,
                opacity: 0,
                filter: "blur(10px)",
                duration: 0.9,
                ease: "expo.out",
                stagger: 0.08,
                scrollTrigger: { trigger: el, start: "top 85%", once: true },
              }),
          });
        });

        gsap.utils.toArray<HTMLElement>("[data-panel]").forEach((el) =>
          gsap.from(el, { scale: 0.94, opacity: 0, duration: 0.9, ease: "expo.out", clearProps: "transform,opacity", scrollTrigger: { trigger: el, start: "top 88%", once: true } }),
        );
      });
      return () => mm.revert();
    },
    { dependencies: [path], revertOnUpdate: true },
  );

  return (
    <div
      ref={glow}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 opacity-0"
      // taste-skill-ignore: the glow is the brief's signature light, drawn behind content only
      style={{ background: "radial-gradient(60% 55% at 70% 40%, rgb(var(--glow) / 0.28), transparent 70%), radial-gradient(45% 40% at 15% 85%, rgb(var(--accent) / 0.08), transparent 70%)" }}
    />
  );
}
