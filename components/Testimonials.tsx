"use client";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useContent } from "./ContentProvider";
import { MOTION } from "@/lib/motion";
import SectionHeading from "./ui/SectionHeading";

/** Draggable carousel (pointer events, 0.5s ease-in-out settle), arrow buttons, dots and ←/→ keys. Off-screen slides are inert. */
export default function Testimonials() {
  const { testimonials: items } = useContent();
  const [idx, setIdx] = useState(0);
  const [dragX, setDragX] = useState<number | null>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const start = useRef({ x: 0, y: 0, t: 0, id: -1, horizontal: false });
  const n = items.length;
  const go = (i: number) => setIdx((i + n) % n);

  const down = (e: PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, horizontal: false };
    setDragX(0);
  };
  const move = (e: PointerEvent) => {
    if (dragX === null || e.pointerId !== start.current.id) return;
    const dx = e.clientX - start.current.x;
    // Only claim the gesture once it's clearly horizontal, so vertical page scrolling still works on touch.
    if (!start.current.horizontal && Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(e.clientY - start.current.y)) {
      start.current.horizontal = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if (start.current.horizontal) setDragX(dx);
  };
  const up = () => {
    if (dragX === null) return;
    const w = viewport.current?.offsetWidth ?? 1;
    const velocity = dragX / Math.max(1, performance.now() - start.current.t); // px/ms
    const swipe = dragX + velocity * 200;
    if (swipe < -w * 0.15) go(idx + 1);
    else if (swipe > w * 0.15) go(idx - 1);
    setDragX(null);
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") go(idx + 1);
    if (e.key === "ArrowLeft") go(idx - 1);
  };

  const dragging = dragX !== null && start.current.horizontal;
  const arrow = "grid h-12 w-12 place-items-center rounded-full border border-line-strong transition-[scale,border-color] duration-200 hover:scale-105 hover:border-fg/60";

  return (
    <section id="testimonials" aria-labelledby="testi-h" className="section cv">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-8">
          <SectionHeading id="testi-h" index="09" eyebrow="Testimonials" title="Trusted by teams who ship." />
          <div className="flex gap-2">
            <button type="button" onClick={() => go(idx - 1)} aria-label="Previous testimonial" aria-controls="testi-track" className={arrow}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(idx + 1)} aria-label="Next testimonial" aria-controls="testi-track" className={arrow}>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        <div ref={viewport} role="region" aria-roledescription="carousel" aria-label="Testimonials" tabIndex={0} onKeyDown={onKey} className="mt-10 cursor-grab lg:mt-14 overflow-hidden rounded-card active:cursor-grabbing">
          <div
            id="testi-track"
            aria-live="polite"
            className="flex touch-pan-y select-none"
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerCancel={up}
            style={{
              transform: `translateX(calc(${-idx * 100}% + ${dragging ? dragX : 0}px))`,
              transition: dragging ? "none" : `transform ${MOTION.dur.carousel}s ease-in-out`,
            }}
          >
            {items.map((t, i) => (
              <div key={t.initials} role="group" aria-roledescription="slide" aria-label={`${i + 1} of ${n}`} aria-hidden={i !== idx} inert={i !== idx} className="w-full shrink-0 pr-1">
                <blockquote className="max-w-[1000px] text-[clamp(26px,3.6vw,48px)] font-medium leading-[1.18] tracking-[-0.03em]">“{t.quote}”</blockquote>
                <p className="mt-10 flex items-center gap-4">
                  <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full border border-line font-mono text-sm text-fg/80">
                    {t.initials}
                  </span>
                  <span>
                    <span className="block font-medium">{t.name}</span>
                    <span className="block text-sm text-muted">{t.role}</span>
                  </span>
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex gap-1">
          {items.map((_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`Show testimonial ${i + 1}`} aria-current={i === idx} className="grid h-11 w-11 place-items-center">
              <span className={`h-1.5 rounded-full transition-[width,background-color] duration-300 ${i === idx ? "w-8 bg-fg" : "w-3 bg-line-strong"}`} />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
