"use client";
import type { RefObject } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { MOTION, prefersReduced } from "@/lib/motion";
import { onNear } from "@/lib/onNear";

/** Staggered fade-up with a slight rotateX settle for every `selector` inside `scope`. Set up lazily; no-op under reduced motion. */
export function useReveal(scope: RefObject<HTMLElement | null>, selector = "[data-card]") {
  useGSAP(
    (_, contextSafe) => {
      if (prefersReduced()) return;
      const items = gsap.utils.toArray<HTMLElement>(selector, scope.current);
      if (!items.length) return;
      const run = contextSafe!(() => {
        gsap.from(items, {
          y: 48,
          opacity: 0,
          rotateX: 10,
          transformPerspective: 900,
          transformOrigin: "50% 100%",
          duration: MOTION.dur.card,
          ease: MOTION.ease.out,
          stagger: MOTION.stagger.cards,
          clearProps: "transform,opacity", // hand transform back to CSS (.tilt) once settled
          scrollTrigger: { trigger: items[0], start: "top 88%", once: true },
        });
      });
      return onNear(items[0], run);
    },
    { scope },
  );
}
