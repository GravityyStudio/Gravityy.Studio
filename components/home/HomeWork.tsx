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
import LoopVideo from "../ui/LoopVideo";

const POSTERS: Record<string, StaticImageData> = { viara, athlex, "case-1": p1, "case-2": p2, "case-3": p3, "case-4": p4 };
// The rhythm changes while the structure holds: each block's visual has its own height.
const HEIGHTS = ["lg:h-[76svh]", "lg:h-[60svh]", "lg:h-[84svh]"];

type Case = { slug: string; video?: boolean; sector: string; title: string; summary: string; url?: string; alt: string; metrics?: { v: string; l: string }[] };

/** One project per block: an oversized visual on the left, a small cluster (detail, title, result, link) on the right. */
export default function HomeWork() {
  const cases = useContent().cases as Case[];
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);

  return (
    <section ref={ref} id="work" data-chapter="dark" aria-labelledby="work-h" className="overflow-hidden bg-bg py-[clamp(88px,12vw,180px)]">
      <div className="container-x">
        <div data-enter className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 id="work-h" className="text-[clamp(28px,3vw,40px)] font-medium tracking-[-0.03em]">
            Selected work
          </h2>
          <Link href="/work" className="group inline-flex min-h-[44px] items-center gap-2 text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            All work
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <ol className="mt-12 flex flex-col gap-[88px] lg:mt-20 lg:gap-[140px]">
          {cases.slice(0, 3).map((c, i) => {
            const poster = POSTERS[c.slug] ?? p1;
            const live = c.url && !c.url.includes("gravityystudio.com");
            return (
              <li key={c.slug} className="grid gap-8 lg:grid-cols-12 lg:items-end lg:gap-x-8">
                <div data-enter data-video-host className={`relative aspect-[4/5] overflow-hidden bg-surface lg:col-span-7 lg:aspect-auto ${HEIGHTS[i % 3]}`}>
                  <Image src={poster} alt={c.alt} fill sizes="(min-width:1024px) 60vw, 100vw" placeholder="blur" className="object-cover object-top" />
                  {c.video && <LoopVideo name={c.slug} label={c.title} poster={poster.src} className="absolute inset-0 h-full w-full object-cover" />}
                </div>

                <div className="flex flex-col gap-7 lg:col-span-4 lg:col-start-9">
                  <div data-enter className="relative ml-auto aspect-[16/10] w-[70%] overflow-hidden rounded-[6px] bg-surface lg:ml-0 lg:w-full">
                    <Image src={poster} alt="" fill sizes="(min-width:1024px) 28vw, 70vw" className="scale-[1.6] object-cover object-bottom" />
                  </div>
                  <div data-enter className="flex flex-col gap-4">
                    <h3 className="text-[clamp(28px,3vw,40px)] font-medium leading-[1.08] tracking-[-0.03em]">{c.title.split(":")[0]}</h3>
                    <p className="-mt-2 text-[15px] text-muted">{c.sector}</p>
                    <p className="max-w-[60ch] text-[17px] leading-relaxed">{c.summary}</p>
                    {c.metrics && (
                      <dl className="flex flex-wrap gap-x-8 gap-y-3">
                        {c.metrics.map((m) => (
                          <div key={m.l} className="flex flex-col-reverse">
                            <dt className="mt-2 text-[15px] text-muted">{m.l}</dt>
                            <dd className="text-[clamp(28px,3vw,40px)] font-medium leading-none tracking-[-0.03em] tabular-nums">{m.v}</dd>
                          </div>
                        ))}
                      </dl>
                    )}
                    {live && (
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group inline-flex min-h-[44px] w-fit items-center gap-2 text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent"
                      >
                        View live site
                        <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                        <span className="sr-only"> (opens in a new tab)</span>
                      </a>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
