"use client";
import { useEffect, type ReactNode } from "react";
import { m } from "framer-motion";
import { ScrollTrigger } from "@/lib/gsap";

// Server HTML is always visible (never ship opacity:0: that hid prerendered pages until Framer loaded and pushed LCP
// past 3s). In the browser, the first page is painted as-is; every client-side navigation after it fades and rises in.
// The flag only flips after the first mount, so hydration always matches the server markup.
let navigated = false;

export default function Template({ children }: { children: ReactNode }) {
  const enter = typeof window !== "undefined" && navigated;
  useEffect(() => {
    navigated = true;
  }, []);
  return (
    <m.div
      initial={enter ? { opacity: 0, y: 18 } : false}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      // ScrollTrigger measured while the page was still offset: re-measure once it has settled
      onAnimationComplete={() => ScrollTrigger.refresh()}
    >
      {children}
    </m.div>
  );
}
