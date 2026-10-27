"use client";
import { useEffect, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { prefersReduced } from "@/lib/motion";

/**
 * Counts a metric like "+64%", "1.4s", "−52%" or "₹1,23,000" up from zero once it scrolls into view. The final text is in the DOM
 * from the start (screen readers, no JS, reduced motion); only the visible digits are animated.
 */
export default function Counter({ value, className = "" }: { value: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    // Grouped numbers ("3,800", "₹1,23,000") count with the same grouping (Indian or Western) they are written in.
    const m = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!el || !m || prefersReduced()) return;
    const [, pre, num, post] = m;
    const target = parseFloat(num.replace(/,/g, ""));
    const decimals = (num.split(".")[1] ?? "").length;
    const locale = /\d,\d\d,\d{3}/.test(num) ? "en-IN" : "en-US";
    const fmt = (n: number) => (num.includes(",") ? Math.round(n).toLocaleString(locale) : n.toFixed(decimals));
    const state = { n: 0 };
    const render = () => (el.textContent = `${pre}${fmt(state.n)}${post}`);
    let tween: gsap.core.Tween | undefined;
    const io = new IntersectionObserver(
      ([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        render();
        tween = gsap.to(state, { n: target, duration: 1.4, ease: "power3.out", onUpdate: render, onComplete: () => (el.textContent = value) });
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => (io.disconnect(), tween?.kill(), void (el.textContent = value));
  }, [value]);

  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {value}
    </span>
  );
}
