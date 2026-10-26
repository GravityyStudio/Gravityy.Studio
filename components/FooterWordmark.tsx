"use client";
import { useEffect, useRef } from "react";
import { prefersReduced } from "@/lib/motion";

const G = 2800; // px/s² gravity
const BOUNCE = 0.58; // restitution
const DROP = 340; // px above the resting point

/**
 * The name edge to edge, with an accent ball that drops onto it: gravity + restitution for the bounce, a damped spring
 * for the squash on each impact. Runs when the wordmark scrolls into view and again when the pointer enters it.
 * Transform only, decorative (aria-hidden ball). Reduced motion: the ball simply rests on the word.
 */
export default function FooterWordmark() {
  const ball = useRef<HTMLSpanElement>(null);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ball.current;
    const box = wrap.current;
    if (!el || !box || prefersReduced()) return;
    let y = -DROP, v = 0, squash = 0, squashV = 0, last = 0, frame = 0, running = false;

    const step = (t: number) => {
      const dt = Math.min(0.032, (t - last) / 1000 || 0.016);
      last = t;
      v += G * dt;
      y += v * dt;
      if (y > 0) {
        y = 0;
        if (Math.abs(v) > 120) squashV -= v * 0.004; // impact feeds the squash spring
        v = -v * BOUNCE;
        if (Math.abs(v) < 90) v = 0;
      }
      // damped spring back to round: k = 260, c = 14
      squashV += (-260 * squash - 14 * squashV) * dt;
      squash += squashV * dt;
      const s = Math.max(-0.35, Math.min(0.35, squash));
      el.style.transform = `translate3d(0, ${y}px, 0) scale(${1 - s}, ${1 + s})`;
      if (v === 0 && y === 0 && Math.abs(squash) < 0.002 && Math.abs(squashV) < 0.01) {
        running = false;
        el.style.transform = "translate3d(0,0,0)";
        return;
      }
      frame = requestAnimationFrame(step);
    };
    const drop = (from = -DROP) => {
      y = from;
      v = 0;
      if (!running) {
        running = true;
        last = performance.now();
        frame = requestAnimationFrame(step);
      }
    };
    el.style.transform = `translate3d(0, ${-DROP}px, 0)`;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (io.disconnect(), drop()), { threshold: 0.5 });
    io.observe(box);
    const kick = () => {
      if (running) {
        v -= 900;
        return;
      }
      drop(-1);
      v = -1100;
    };
    box.addEventListener("pointerenter", kick);
    return () => {
      io.disconnect();
      box.removeEventListener("pointerenter", kick);
      cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div ref={wrap} className="relative pt-16">
      {/* a layer with the word's own aspect ratio: the ball rests on the x-height of the last "y" (≈24% down) */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-16 aspect-[1000/196]">
        <span
          ref={ball}
          className="absolute right-[4%] top-[calc(24%-clamp(18px,3.4vw,52px))] block h-[clamp(18px,3.4vw,52px)] w-[clamp(18px,3.4vw,52px)] origin-bottom rounded-full bg-accent shadow-[0_0_40px_rgb(var(--accent)/0.5)]"
        />
      </div>
      <svg viewBox="0 0 1000 196" className="block w-full" role="img" aria-label="Gravityy">
        <text x="0" y="168" textLength="1000" lengthAdjust="spacingAndGlyphs" fill="currentColor" style={{ fontFamily: "var(--font-sans)", fontSize: 230, fontWeight: 800, letterSpacing: "-0.06em" }}>
          gravityy
        </text>
      </svg>
    </div>
  );
}
