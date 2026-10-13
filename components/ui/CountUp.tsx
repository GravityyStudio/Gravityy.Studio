"use client";
import { useRef } from "react";
import { gsap } from "@/lib/gsap";
import { MOTION } from "@/lib/motion";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";

type Props = { value: number; decimals?: number; prefix?: string; suffix?: string; duration?: number; locale?: string; className?: string };

const fmt = (n: number, d: number, locale: string) => n.toLocaleString(locale, { minimumFractionDigits: d, maximumFractionDigits: d });

/** Renders the final value on the server (no-JS, SEO, reduced motion); counts up from 0 once on enter. Set up lazily. */
export default function CountUp({ value, decimals = 0, prefix = "", suffix = "", duration = MOTION.dur.count, locale = "en-US", className }: Props) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = prefix + fmt(value, decimals, locale) + suffix;

  useLazyGSAP(ref, () => {
    const el = ref.current!;
    const o = { n: 0 };
    const set = () => (el.textContent = prefix + fmt(o.n, decimals, locale) + suffix);
    set();
    gsap.to(o, { n: value, duration, ease: "power3.out", onUpdate: set, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
    return () => {
      el.textContent = final;
    };
  });

  return (
    <span ref={ref} className={`tabular-nums ${className ?? ""}`}>
      {final}
    </span>
  );
}
