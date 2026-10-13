"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReduced } from "@/lib/motion";

/** Tweens from the previous value to the new one; text is the formatted final value for SSR and reduced motion. */
export default function AnimatedNumber({ value, format, className }: { value: number; format: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef(value);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReduced()) {
      el.textContent = format(value);
      prev.current = value;
      return;
    }
    const o = { n: prev.current };
    const tw = gsap.to(o, { n: value, duration: 0.6, ease: "power3.out", onUpdate: () => (el.textContent = format(o.n)) });
    prev.current = value;
    return () => {
      tw.kill();
    };
  }, [value, format]);

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {format(value)}
    </span>
  );
}
