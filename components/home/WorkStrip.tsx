"use client";
import { useRef } from "react";
import Image, { type StaticImageData } from "next/image";
import Link from "@/components/ui/SmartLink";
import { ArrowUpRight } from "lucide-react";
import p1 from "@/public/media/case-1-poster.jpg";
import p2 from "@/public/media/case-2-poster.jpg";
import p3 from "@/public/media/case-3-poster.jpg";
import p4 from "@/public/media/case-4-poster.jpg";
import viara from "@/public/media/work-viara.jpg";
import athlex from "@/public/media/work-athlex.jpg";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";

const POSTERS: Record<string, StaticImageData> = { viara, athlex, "case-1": p1, "case-2": p2, "case-3": p3, "case-4": p4 };

/** Four recent projects as one row of pictures: proof on pages that are mostly words. Links to /work.
 * `surface` picks the ground so it never matches the section next to it. */
export default function WorkStrip({ surface = true }: { surface?: boolean }) {
  const cases = useContent().cases as { slug: string; title: string; sector: string; alt: string }[];
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);

  return (
    <section ref={ref} data-chapter="dark" aria-labelledby="strip-h" className={`${surface ? "bg-surface" : "bg-bg"} py-[clamp(88px,12vw,160px)]`}>
      <div className="container-x">
        <div data-enter className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="strip-h" className="text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.03em]">
            Recent work
          </h2>
          <Link href="/work" className="group inline-flex min-h-[44px] items-center gap-2 text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            All projects
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 lg:mt-14 lg:grid-cols-4 lg:gap-x-8">
          {cases.slice(0, 4).map((c) => (
            <li key={c.slug} data-enter>
              <Link href="/work" className="group flex flex-col gap-4">
                <span className="relative block aspect-[4/5] overflow-hidden bg-surface">
                  <Image src={POSTERS[c.slug] ?? p1} alt={c.alt} fill sizes="(min-width:1024px) 25vw, 50vw" placeholder="blur" className="object-cover object-top transition-transform duration-700 group-hover:scale-[1.03]" />
                </span>
                <span className="text-[17px] font-medium leading-snug">{c.title.split(":")[0]}</span>
                <span className="-mt-3 text-[15px] text-muted">{c.sector}</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
