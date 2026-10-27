"use client";
import type { ReactNode } from "react";
import { m } from "framer-motion";
import { ScrollTrigger } from "@/lib/gsap";

// The first page a visitor lands on is painted as-is (no hidden state, so LCP is never delayed). Every client-side
// navigation after that fades and rises in. Applies to the site, the portal and the admin.
let landed = false;

export default function Template({ children }: { children: ReactNode }) {
  const first = !landed;
  landed = true;
  return (
    <m.div
      initial={first ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      // ScrollTrigger measured while the page was still offset: re-measure once it has settled
      onAnimationComplete={() => ScrollTrigger.refresh()}
    >
      {children}
    </m.div>
  );
}
