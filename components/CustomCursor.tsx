"use client";
import { useEffect, useRef, useState } from "react";
import { prefersReduced } from "@/lib/motion";

const TRAIL = 8;
const LERP = 0.15; // dot follow speed (brief: lerp 0.15)
const INTERACTIVE = "a,button,input,select,textarea,label,[role='button'],[role='radio']";

/** Touch screens: a short accent ripple where a link or button is tapped, in place of the cursor. Transform/opacity only. */
function useTapRipple() {
  useEffect(() => {
    if (window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReduced()) return;
    const down = (e: PointerEvent) => {
      if (e.pointerType === "mouse" || !(e.target as Element | null)?.closest?.(INTERACTIVE)) return;
      const r = document.createElement("span");
      r.setAttribute("aria-hidden", "true");
      r.className = "pointer-events-none fixed z-[300] -ml-6 -mt-6 block h-12 w-12 rounded-full bg-accent/30";
      r.style.left = `${e.clientX}px`;
      r.style.top = `${e.clientY}px`;
      document.body.appendChild(r);
      r.animate([{ transform: "scale(0.2)", opacity: 1 }, { transform: "scale(1.6)", opacity: 0 }], { duration: 500, easing: "cubic-bezier(.22,1,.36,1)" }).onfinish = () => r.remove();
    };
    document.addEventListener("pointerdown", down, { passive: true });
    return () => document.removeEventListener("pointerdown", down);
  }, []);
}

/**
 * Accent dot with a dotted trail. Each trail dot eases toward the one ahead of it, so the trail lags and tapers.
 * Over links, buttons and form controls the dot grows into a ring. Only for a fine pointer with motion allowed:
 * never on touch (touch gets a tap ripple instead), never under reduced motion. The native cursor is hidden only while this one is drawn.
 */
export default function CustomCursor() {
  const dot = useRef<HTMLDivElement>(null);
  const trail = useRef<(HTMLSpanElement | null)[]>([]);
  const [on, setOn] = useState(false);
  const [big, setBig] = useState(false);
  useTapRipple();

  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches || prefersReduced()) return;
    setOn(true);
    document.documentElement.classList.add("has-cursor");
    const target = { x: -100, y: -100 };
    const pts = Array.from({ length: TRAIL + 1 }, () => ({ x: -100, y: -100 }));
    let frame = 0;
    let visible = false;

    const tick = () => {
      pts[0].x += (target.x - pts[0].x) * LERP;
      pts[0].y += (target.y - pts[0].y) * LERP;
      for (let i = 1; i < pts.length; i++) {
        pts[i].x += (pts[i - 1].x - pts[i].x) * 0.35;
        pts[i].y += (pts[i - 1].y - pts[i].y) * 0.35;
      }
      if (dot.current) dot.current.style.transform = `translate3d(${pts[0].x}px, ${pts[0].y}px, 0)`;
      trail.current.forEach((el, i) => {
        if (el) el.style.transform = `translate3d(${pts[i + 1].x}px, ${pts[i + 1].y}px, 0) scale(${1 - (i + 1) / (TRAIL + 2)})`;
      });
      frame = requestAnimationFrame(tick);
    };
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      target.x = e.clientX;
      target.y = e.clientY;
      if (!visible) {
        visible = true;
        pts.forEach((p) => ((p.x = e.clientX), (p.y = e.clientY)));
        document.documentElement.dataset.cursor = "on";
      }
      setBig(!!(e.target as Element | null)?.closest(INTERACTIVE));
    };
    const leave = () => {
      visible = false;
      delete document.documentElement.dataset.cursor;
    };
    frame = requestAnimationFrame(tick);
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", leave);
      document.documentElement.classList.remove("has-cursor");
      delete document.documentElement.dataset.cursor;
    };
  }, []);

  if (!on) return null;
  return (
    <div aria-hidden="true" className="cursor-layer pointer-events-none fixed inset-0 z-[300]">
      {Array.from({ length: TRAIL }, (_, i) => (
        <span
          key={i}
          ref={(el) => {
            trail.current[i] = el;
          }}
          className="absolute left-0 top-0 -ml-[2px] -mt-[2px] block h-1 w-1 rounded-full bg-accent"
          style={{ opacity: 0.7 * (1 - i / TRAIL) }}
        />
      ))}
      <div ref={dot} className="absolute left-0 top-0">
        {/* dot and ring swap by scale + opacity only */}
        <span className={`absolute -left-[5px] -top-[5px] block h-2.5 w-2.5 rounded-full bg-accent transition-[transform,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${big ? "scale-0 opacity-0" : ""}`} />
        <span
          className={`absolute -left-[22px] -top-[22px] block h-11 w-11 rounded-full bg-accent/10 shadow-[inset_0_0_0_1.5px_rgb(var(--accent))] transition-[transform,opacity] duration-300 ease-[cubic-bezier(.22,1,.36,1)] ${big ? "" : "scale-[0.2] opacity-0"}`}
        />
      </div>
    </div>
  );
}
