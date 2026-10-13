"use client";
import type { RefObject } from "react";
import { useGSAP } from "@/lib/gsap";
import { prefersReduced } from "@/lib/motion";
import { onNear } from "@/lib/onNear";

/**
 * useGSAP, but `setup` only runs once `scope` nears the viewport, so tweens/ScrollTriggers for
 * far-off sections cost nothing at load (no getComputedStyle / position measuring up front).
 * Everything created in `setup` (incl. gsap.matchMedia) is reverted on unmount.
 */
export function useLazyGSAP(scope: RefObject<HTMLElement | null>, setup: () => void | (() => void)) {
  useGSAP(
    (_, contextSafe) => {
      if (prefersReduced()) return;
      let cleanup: void | (() => void);
      const run = contextSafe!(() => {
        cleanup = setup();
      });
      const stop = onNear(scope.current, run);
      return () => {
        stop();
        if (typeof cleanup === "function") cleanup();
      };
    },
    { scope },
  );
}
