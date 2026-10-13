"use client";
import { useRef } from "react";
import { useContent } from "./ContentProvider";
import { gsap } from "@/lib/gsap";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";
import { MOTION, MOTION_OK } from "@/lib/motion";
import SectionHeading from "./ui/SectionHeading";
import Icon from "./ui/Icon";

/** Seven stages; bar widths come from data and grow sequentially on enter. */
export default function Funnel() {
  const { funnel } = useContent();
  const ref = useRef<HTMLElement>(null);

  useLazyGSAP(ref, () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const tl = gsap.timeline({ scrollTrigger: { trigger: "[data-funnel]", start: "top 80%", once: true } });
        tl.from("[data-bar]", { scaleX: 0, duration: MOTION.dur.funnelBar, ease: MOTION.ease.expo, stagger: MOTION.stagger.funnel, transformOrigin: "0% 50%" })
          .from("[data-bar-text]", { opacity: 0, x: -12, duration: 0.5, stagger: MOTION.stagger.funnel, ease: MOTION.ease.out }, 0.25);
      });
      return () => mm.revert();
  });

  return (
    <section ref={ref} id="funnel" aria-labelledby="funnel-h" className="section cv">
      <div className="container-x">
        <SectionHeading id="funnel-h" index="08" eyebrow="Growth funnel" title="A funnel engineered end to end." lede="Seven connected stages, each measured and automated." />
        <ol data-funnel className="mt-10 flex flex-col gap-2.5 lg:mt-14">
          {funnel.map((f, i) => (
            <li key={f.name} className="relative">
              <div data-bar aria-hidden="true" className="absolute inset-y-0 left-0 rounded-2xl border border-line bg-raised" style={{ width: `max(${f.width}%, min(100%, 320px))` }} />
              <div data-bar-text className="relative flex flex-wrap items-baseline gap-x-5 gap-y-1 px-5 py-4 sm:px-6" style={{ maxWidth: `max(${f.width}%, min(100%, 320px))` }}>
                <span className="flex items-center gap-3 self-center">
                  <span className="text-fg/80">
                    <Icon name={f.icon} size={18} />
                  </span>
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <h3 className="text-lg font-medium tracking-[-0.02em]">{f.name}</h3>
                <p className="min-w-[200px] flex-1 text-sm text-muted">{f.desc}</p>
                <span className="hidden font-mono text-xs text-fg/50 sm:inline">{f.width}%</span>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
