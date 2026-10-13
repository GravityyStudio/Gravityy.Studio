"use client";
import { useRef } from "react";
import Link from "@/components/ui/SmartLink";
import { useContent } from "./ContentProvider";
import { gsap, useGSAP } from "@/lib/gsap";
import { useReveal } from "@/hooks/useReveal";
import SectionHeading from "./ui/SectionHeading";
import Icon from "./ui/Icon";
import Tilt from "./ui/Tilt";

/** Pinned horizontal rail on lg+ (cards translate with scroll); plain grid with staggered reveals below lg. */
type More = { href: string; label: string };

export default function ServicesRail({ more }: { more?: More }) {
  const { services } = useContent();
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  useReveal(section);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const t = track.current!;
        const distance = () => t.scrollWidth - t.clientWidth;
        gsap.to(t, {
          x: () => -distance(),
          ease: "none",
          scrollTrigger: {
            trigger: section.current,
            start: "top top",
            end: () => `+=${distance()}`,
            pin: true,
            pinType: "transform", // no fixed-position switch → no layout shift; Lenis keeps it in sync
            scrub: 0.6,
            invalidateOnRefresh: true,
          },
        });
      });
      return () => mm.revert();
    },
    { scope: section },
  );

  return (
    <section ref={section} id="services" aria-labelledby="services-h" className="section overflow-hidden max-lg:[content-visibility:auto] max-lg:[contain-intrinsic-size:auto_3000px] lg:flex lg:min-h-screen lg:flex-col lg:justify-center lg:pb-12 lg:pt-28">
      <div className="container-x">
        <SectionHeading
          id="services-h"
          index="01"
          eyebrow="Services"
          title="Everything your digital system needs, under one roof."
          lede="Design, engineering, automation and growth, delivered by one team that owns the outcome."
          more={more}
        />
      </div>
      <ul
        ref={track}
        className="container-x mt-10 grid gap-4 sm:grid-cols-2 lg:mt-14 lg:flex lg:max-w-none lg:gap-5 lg:pl-[max(32px,calc((100vw-1280px)/2+32px))] lg:pr-[max(32px,calc((100vw-1280px)/2+32px))]"
      >
        {services.map((s, i) => (
          <Tilt
            key={s.id}
            as="li"
            data-card
            className="card group relative flex min-h-[300px] flex-col gap-5 p-7 hover:border-line-strong lg:w-[360px] lg:shrink-0"
          >
            <div className="flex items-start justify-between">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-line text-fg/90">
                <Icon name={s.icon} size={22} />
              </span>
              <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
            </div>
            <h3 className="text-[22px] font-medium tracking-[-0.03em]">
              {/* Stretched link: the whole card opens the service page; tool chips stay plain text. */}
              <Link href={`/services/${s.id}`} className="after:absolute after:inset-0 after:rounded-card after:content-['']">
                {s.name}
              </Link>
            </h3>
            <p className="text-[15px] leading-relaxed text-muted">{s.desc}</p>
            <ul aria-label="Tools" className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {s.tags.map((t) => (
                <li key={t} className="rounded-full border border-line px-3 py-1 font-mono text-[11px] text-fg/75">
                  {t}
                </li>
              ))}
            </ul>
          </Tilt>
        ))}
      </ul>
    </section>
  );
}
