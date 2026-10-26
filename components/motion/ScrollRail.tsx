"use client";
import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP } from "@/lib/gsap";

/** Scroll progress: a thin rail on the left edge with an accent dot travelling down it. Desktop only, decorative. */
export default function ScrollRail() {
  const dot = useRef<HTMLSpanElement>(null);
  const path = usePathname();

  useGSAP(
    () => {
      gsap.fromTo(dot.current, { yPercent: 0 }, { yPercent: 100, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
    },
    { dependencies: [path], revertOnUpdate: true },
  );

  return (
    <div aria-hidden="true" className="pointer-events-none fixed left-4 top-1/2 z-40 hidden h-[36vh] -translate-y-1/2 lg:block xl:left-6">
      <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-fg/15" />
      {/* the dot's box is the rail's full height, so yPercent 0 → 100 maps scroll 0 → max */}
      <span ref={dot} className="absolute inset-x-0 top-0 block h-full">
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_12px_rgb(var(--accent)/0.8)]" />
      </span>
    </div>
  );
}
