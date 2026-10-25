"use client";
import type { RefObject } from "react";
import { gsap } from "@/lib/gsap";
import { MOTION } from "@/lib/motion";
import { useLazyGSAP } from "./useLazyGSAP";

/**
 * Section entrance: every `[data-enter]` inside `scope` rises 24px and fades in as it reaches 85% of the viewport,
 * neighbours 70ms apart, once. One trigger per element, so long sections reveal as they are read. Elements stay
 * visible if scripts fail or motion is reduced: the hidden state is set here, never in CSS. Anything already on
 * screen when this runs (an anchor jump, a fast scroll) is left as it is rather than hidden and replayed.
 */
export function useEnter(scope: RefObject<HTMLElement | null>) {
  useLazyGSAP(scope, () => {
    gsap.utils.toArray<HTMLElement>("[data-enter]", scope.current).forEach((el, i) => {
      if (el.getBoundingClientRect().top < window.innerHeight * 0.85) return;
      gsap.from(el, {
        opacity: 0,
        y: 24,
        duration: MOTION.dur.card,
        ease: MOTION.ease.out,
        delay: (i % 4) * 0.07,
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
      });
    });
  });
}
