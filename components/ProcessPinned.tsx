"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { useContent } from "./ContentProvider";
import poster from "@/public/media/process-poster.jpg";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { MOTION } from "@/lib/motion";
import { useReveal } from "@/hooks/useReveal";
import SectionHeading from "./ui/SectionHeading";
import Icon from "./ui/Icon";
import LoopVideo from "./ui/LoopVideo";

type Mode = "static" | "scrub" | "pinned";
const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Scroll-driven process timeline.
 * - pinned (lg, ≥700px tall): section pins; the progress line + glowing head draw with scroll, the media zooms out,
 *   and the 8 steps light up one by one.
 * - scrub (smaller screens / short laptops): no pin; the line draws as you scroll the list and each step lights
 *   up as it crosses the middle of the screen.
 * - static (reduced motion): everything lit, no motion.
 */
type More = { href: string; label: string };

export default function ProcessPinned({ more }: { more?: More }) {
  const { process: steps } = useContent();
  const ref = useRef<HTMLElement>(null);
  const [mode, setMode] = useState<Mode>("static");
  const [active, setActive] = useState(0);
  useReveal(ref, "[data-step]");

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      const draw = (st: ScrollTrigger.Vars) =>
        gsap
          .timeline({ scrollTrigger: st })
          .fromTo("[data-progress]", { scaleY: 0 }, { scaleY: 1, ease: "none" }, 0)
          .fromTo("[data-progress-dot]", { top: "0%" }, { top: "100%", ease: "none" }, 0);

      mm.add({ pin: "(min-width: 1024px) and (min-height: 700px)", motion: "(prefers-reduced-motion: no-preference)" }, (ctx) => {
        const { pin, motion } = ctx.conditions as { pin: boolean; motion: boolean };
        if (!motion) return;
        if (pin) {
          setMode("pinned");
          const tl = draw({
            trigger: ref.current,
            start: "top top",
            end: () => `+=${window.innerHeight * 3}`,
            pin: true,
            pinType: "transform",
            scrub: 0.4,
            onUpdate: (s) => setActive(Math.min(steps.length - 1, Math.floor(s.progress * steps.length))),
          });
          tl.fromTo("[data-process-media] img, [data-process-media] video", { scale: 1.18 }, { scale: 1, ease: "none" }, 0);
        } else {
          setMode("scrub");
          draw({ trigger: "[data-steps]", start: "top 60%", end: "bottom 60%", scrub: 0.4 });
          gsap.utils.toArray<HTMLElement>("[data-step]", ref.current).forEach((el, i) =>
            ScrollTrigger.create({ trigger: el, start: "top 60%", onEnter: () => setActive(i), onLeaveBack: () => setActive(Math.max(0, i - 1)) }),
          );
        }
        return () => setMode("static");
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const animated = mode !== "static";

  return (
    <section ref={ref} id="process" aria-labelledby="process-h" className="section max-lg:[content-visibility:auto] max-lg:[contain-intrinsic-size:auto_1600px] lg:flex lg:min-h-screen lg:items-center lg:py-24">
      <div className="container-x grid gap-14 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
        <div className="flex flex-col gap-10">
          <SectionHeading id="process-h" index="05" eyebrow="How we work" title="Eight steps from idea to scale." lede="A fixed, visible process so you always know what ships next." more={more} />
          <div data-video-host className="theme-dark relative hidden aspect-[16/10] overflow-hidden rounded-card border border-line lg:block">
            <div data-process-media className="absolute inset-0">
              <Image src={poster} alt="" fill sizes="40vw" placeholder="blur" className="object-cover" />
              <LoopVideo name="process" label="ambient video" className="absolute inset-0 h-full w-full object-cover" controlClassName="right-4 top-4" />
            </div>
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            {/* Big step counter swaps with a short rise on each step change. */}
            <div aria-hidden="true" className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
              <p key={active} className="step-swap">
                <span className="block text-[clamp(56px,6vw,88px)] font-medium leading-none tracking-[-0.05em]">{pad(active + 1)}</span>
                <span className="mt-2 block font-mono text-xs uppercase tracking-[0.14em] text-fg/80">{steps[active].name}</span>
              </p>
              <span className="font-mono text-xs text-fg/60">/ {pad(steps.length)}</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <span aria-hidden="true" className="absolute bottom-0 left-[19px] top-0 w-px bg-line" />
          <span aria-hidden="true" data-progress className="absolute bottom-0 left-[19px] top-0 w-px origin-top bg-accent" style={{ transform: animated ? undefined : "scaleY(1)" }} />
          {/* Always mounted (GSAP targets it on setup); only visible while the timeline is animated. */}
          <span
            aria-hidden="true"
            data-progress-dot
            className={`absolute left-[19px] top-0 z-20 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent shadow-[0_0_14px_3px_rgba(168,240,30,0.55)] ${animated ? "" : "hidden"}`}
          />
          <ol data-steps className="flex flex-col">
            {steps.map((s, i) => {
              const lit = !animated || i <= active;
              const current = animated && i === active;
              return (
                <li key={s.name} data-step aria-current={current ? "step" : undefined} className="relative flex gap-6 py-3 lg:py-2.5">
                  <span
                    className={`relative z-10 grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-[background-color,border-color,color,transform] duration-500 ${
                      current ? "scale-110 border-accent bg-accent text-bg" : lit ? "border-fg/60 bg-bg text-fg" : "border-line bg-bg text-muted"
                    }`}
                  >
                    <Icon name={s.icon} size={16} />
                  </span>
                  <div
                    className={`flex-1 transition-[opacity,transform] ease-out ${lit ? "opacity-100" : "opacity-75"} ${current ? "translate-x-1.5" : ""}`}
                    style={{ transitionDuration: `${MOTION.dur.card * 1000}ms` }}
                  >
                    <h3 className="flex items-baseline gap-3 pt-1.5 text-[22px] font-medium tracking-[-0.03em]">
                      <span className={`font-mono text-xs transition-colors duration-500 ${current ? "text-accent" : "text-muted"}`}>{pad(i + 1)}</span>
                      {s.name}
                    </h3>
                    {/* Always in layout (no height animation → no layout shift). Dim state stays ≥4.5:1 contrast. */}
                    <p className="pt-1 text-[15px] leading-relaxed text-muted">{s.desc}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
