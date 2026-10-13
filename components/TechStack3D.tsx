"use client";
import { useRef, type CSSProperties } from "react";
import { useContent } from "./ContentProvider";
import { gsap } from "@/lib/gsap";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";
import { useReveal } from "@/hooks/useReveal";
import SectionHeading from "./ui/SectionHeading";
import Icon from "./ui/Icon";

/** Readable grouped list + a decorative CSS-3D stack of layered planes that separates as you scroll (md+). */
export default function TechStack3D() {
  const { stack } = useContent();
  const ref = useRef<HTMLElement>(null);
  const scene = useRef<HTMLDivElement>(null);
  useReveal(ref);

  useLazyGSAP(ref, () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(scene.current, { "--gap": "10px", "--rz": "-30deg" }, {
          "--gap": "64px",
          "--rz": "-44deg",
          ease: "none",
          scrollTrigger: { trigger: scene.current, start: "top bottom", end: "bottom 40%", scrub: true },
        });
        gsap.to("[data-plane-float]", { y: -10, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
      return () => mm.revert();
  });

  return (
    <section ref={ref} id="stack" aria-labelledby="stack-h" className="section cv">
      <div className="container-x">
        <SectionHeading id="stack-h" index="06" eyebrow="Technology" title="Modern, proven, boringly reliable." lede="Tools we know deeply and trust in production." />
        <div className="mt-10 grid items-center gap-14 lg:mt-14 lg:grid-cols-[1.1fr_1fr]">
          <div className="grid gap-x-10 gap-y-10 sm:grid-cols-2">
            {stack.map((g) => (
              <div key={g.group} data-card className="border-t border-line pt-5">
                <h3 className="mb-4 flex items-center gap-2.5 font-mono text-xs uppercase tracking-[0.12em] text-fg/80">
                  <Icon name={g.icon} size={16} />
                  {g.group}
                </h3>
                <ul className="flex flex-wrap gap-2">
                  {g.items.map((t) => (
                    <li key={t} className="rounded-xl border border-line bg-raised px-3.5 py-2 text-[15px]">
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div aria-hidden="true" className="relative hidden h-[520px] [perspective:1400px] md:block">
            <div data-plane-float className="absolute inset-0">
              <div
                ref={scene}
                className="absolute left-1/2 top-1/2 h-[250px] w-[380px] [transform-style:preserve-3d]"
                style={{ "--gap": "36px", "--rz": "-38deg", transform: "translate(-50%,-50%) rotateX(58deg) rotateZ(var(--rz))" } as CSSProperties}
              >
                {stack.map((g, i) => (
                  <div
                    key={g.group}
                    className={`absolute inset-0 flex flex-col justify-between rounded-[20px] border p-5 [backface-visibility:hidden] ${i === stack.length - 1 ? "border-accent/70 bg-hi/90" : "border-line bg-raised/85"}`}
                    style={{ transform: `translateZ(calc(${i} * var(--gap)))` }}
                  >
                    <span className={`flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] ${i === stack.length - 1 ? "text-accent" : "text-fg/70"}`}>
                      <Icon name={g.icon} size={14} />
                      {g.group}
                    </span>
                    <span className="font-mono text-[11px] text-fg/40">
                      {String(i + 1).padStart(2, "0")} · {g.items.length} tools
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
