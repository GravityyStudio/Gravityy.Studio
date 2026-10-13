"use client";
import { useRef } from "react";
import Image from "next/image";
import { useContent } from "./ContentProvider";
import poster from "@/public/media/solutions-poster.jpg";
import { gsap } from "@/lib/gsap";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";
import { useReveal } from "@/hooks/useReveal";
import SectionHeading from "./ui/SectionHeading";
import CountUp from "./ui/CountUp";
import Icon from "./ui/Icon";
import Tilt from "./ui/Tilt";
import LoopVideo from "./ui/LoopVideo";

/** "6 wks" → { value: 6, suffix: " wks", decimals: 0 } */
function parseStat(stat: string) {
  const m = /^([\d.]+)(.*)$/.exec(stat);
  if (!m) return { value: 0, suffix: stat, decimals: 0 };
  return { value: parseFloat(m[1]), suffix: m[2], decimals: m[1].split(".")[1]?.length ?? 0 };
}

const SPEEDS = [-6, -14, -4, -18, -10]; // yPercent drift per card → layered parallax

type More = { href: string; label: string };

export default function Solutions({ more }: { more?: More }) {
  const { solutions } = useContent();
  const ref = useRef<HTMLElement>(null);
  useReveal(ref);

  useLazyGSAP(ref, () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        gsap.utils.toArray<HTMLElement>("[data-parallax]", ref.current).forEach((el, i) => {
          gsap.to(el, { yPercent: SPEEDS[i % SPEEDS.length], ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
        });
      });
      return () => mm.revert();
  });

  return (
    <section ref={ref} id="solutions" aria-labelledby="solutions-h" className="section cv">
      <div className="container-x">
        <SectionHeading
          id="solutions-h"
          index="02"
          eyebrow="Solutions"
          title="We don't sell services. We build systems."
          lede="Each engagement is scoped around a business result, then built from the services that get you there."
          more={more}
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-5">
          {solutions.map((s, i) => {
            const stat = parseStat(s.stat);
            const feature = i === 0;
            return (
              <li key={s.name} data-parallax className={feature ? "sm:col-span-2" : ""}>
                <Tilt
                  data-card
                  data-video-host={feature || undefined}
                  className={`card relative flex h-full min-h-[260px] flex-col gap-3 overflow-hidden p-7 hover:border-line-strong ${feature ? "lg:min-h-[340px]" : ""}`}
                >
                  {feature && (
                    <div className="absolute inset-0 -z-0" aria-hidden="true">
                      <Image src={poster} alt="" fill sizes="(min-width:1024px) 66vw, 100vw" placeholder="blur" className="object-cover opacity-60" />
                      <LoopVideo name="solutions" label="ambient video" className="absolute inset-0 h-full w-full object-cover opacity-60" controlClassName="right-5 top-5" />
                      <div className="absolute inset-0 bg-gradient-to-t from-surface-2 via-surface-2/60 to-transparent" />
                    </div>
                  )}
                  <div className="relative flex items-center gap-2.5 text-fg/80">
                    <Icon name={s.icon} size={18} />
                    <h3 className="font-mono text-xs uppercase tracking-[0.12em]">{s.name}</h3>
                  </div>
                  <p className="relative mt-auto text-stat font-medium">
                    <CountUp value={stat.value} decimals={stat.decimals} suffix={stat.suffix} />
                  </p>
                  <p className="relative max-w-[340px] text-[15px] leading-relaxed text-muted">{s.label}</p>
                </Tilt>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
