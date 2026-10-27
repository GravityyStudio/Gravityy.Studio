"use client";
import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { MOTION_OK } from "@/lib/motion";

// Node positions in the 1000×600 viewBox (and as % for the HTML labels laid over it).
const NODES: { label: string; x: number; y: number }[] = [
  { label: "Design", x: 130, y: 100 },
  { label: "Engineering", x: 90, y: 300 },
  { label: "Automation", x: 130, y: 500 },
  { label: "Analytics", x: 870, y: 100 },
  { label: "SEO", x: 910, y: 300 },
  { label: "Performance", x: 870, y: 500 },
];
const C = { x: 500, y: 300 };
const curve = (n: { x: number; y: number }) => `M${C.x} ${C.y} C ${(C.x + n.x) / 2} ${C.y}, ${(C.x + n.x) / 2} ${n.y}, ${n.x} ${n.y}`;

/** "Your product" at the centre, linked to six disciplines. The curves draw as the section scrolls through. */
export default function NodeNetwork() {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo(
          "[data-line]",
          { strokeDashoffset: 1 },
          { strokeDashoffset: 0, ease: "none", stagger: 0.08, scrollTrigger: { trigger: "[data-net]", start: "top 80%", end: "center 45%", scrub: 0.6 } },
        );
        gsap.from("[data-node]", { opacity: 0, scale: 0.85, duration: 0.6, ease: "expo.out", stagger: 0.07, scrollTrigger: { trigger: "[data-net]", start: "top 70%", once: true } });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const pill = "rounded-pill bg-surface px-5 py-3 text-[15px] font-semibold hairline";
  return (
    <section ref={ref} data-glow aria-labelledby="net-h" className="py-[clamp(80px,11vh,140px)]">
      <div className="container-x">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <h2 id="net-h" data-reveal className="display !text-[clamp(36px,5vw,80px)] lg:col-span-7">
            One team, every layer
          </h2>
          <p className="max-w-[46ch] text-fg/85 lg:col-span-5">
            Design, engineering, automation, analytics, SEO and performance are planned around one product, so nothing is handed over between agencies.
          </p>
        </div>

        {/* Diagram (tablet and up) */}
        <div data-net className="relative mx-auto mt-14 hidden aspect-[5/3] max-w-[1100px] md:block">
          <svg viewBox="0 0 1000 600" className="absolute inset-0 h-full w-full" aria-hidden="true">
            {NODES.map((n) => (
              <path key={n.label} data-line d={curve(n)} pathLength={1} strokeDasharray="1" fill="none" stroke="rgb(var(--accent))" strokeOpacity="0.55" strokeWidth="1.5" />
            ))}
          </svg>
          <ul aria-label="Disciplines around your product" className="absolute inset-0">
            {NODES.map((n) => (
              <li key={n.label} className="absolute -translate-x-1/2 -translate-y-1/2" style={{ left: `${n.x / 10}%`, top: `${n.y / 6}%` }}>
                <span data-node className={`${pill} block whitespace-nowrap`}>
                  {n.label}
                </span>
              </li>
            ))}
          </ul>
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
            <p data-node className="rounded-pill bg-accent px-7 py-4 text-[17px] font-bold text-bg shadow-[0_0_60px_rgb(var(--glow)/0.55),0_0_24px_rgb(var(--accent)/0.45)]">
              Your product
            </p>
          </div>
        </div>

        {/* Phones: the same relationship, stacked */}
        <div className="mt-12 flex flex-col items-center gap-4 md:hidden">
          <p className="rounded-pill bg-accent px-6 py-3 text-[17px] font-bold text-bg shadow-[0_0_40px_rgb(var(--glow)/0.5)]">Your product</p>
          <span aria-hidden="true" className="h-8 w-px bg-accent/50" />
          <ul className="flex flex-wrap justify-center gap-2">
            {NODES.map((n) => (
              <li key={n.label} className={pill}>
                {n.label}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
