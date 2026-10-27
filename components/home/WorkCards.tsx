"use client";
import Image, { type StaticImageData } from "next/image";
import Link from "@/components/ui/SmartLink";
import { ArrowUpRight } from "lucide-react";
import p1 from "@/public/media/case-1-poster.jpg";
import viara from "@/public/media/work-viara.jpg";
import athlex from "@/public/media/work-athlex.jpg";
import Counter from "../ui/Counter";
import LoopVideo from "../ui/LoopVideo";

type Metric = { v: string; l: string };
type Card = { slug: string; title: string; sector: string; summary: string; image: StaticImageData; alt: string; reel?: string; url?: string; metrics: Metric[] | null };

// The three featured projects. Viara and ATHLEX have no measured outcomes on record yet: their metric slots are
// labelled placeholders ({{…}}) to fill with real numbers, never estimates.
const CARDS: Card[] = [
  {
    slug: "viara",
    title: "Viara Studios",
    sector: "Luxury real estate · Website",
    summary: "A scroll-built story site with a signature-residence showcase, a filterable home finder and an EMI calculator.",
    image: viara,
    alt: "Viara Studios website hero: a construction site at dusk with the headline “Every legacy begins with ground.”",
    url: "https://viara-studios.vercel.app/",
    metrics: null,
  },
  {
    slug: "athlex",
    title: "ATHLEX",
    sector: "Fitness club · Website",
    summary: "A bold site for a Bengaluru strength and performance club, with programs, trainers and free-trial booking.",
    image: athlex,
    alt: "ATHLEX website hero: a gym with dumbbell racks and the headline “Build your strongest self.”",
    url: "https://athlex-delta.vercel.app/",
    metrics: null,
  },
  {
    slug: "case-1",
    title: "A storefront rebuilt around repeat orders",
    sector: "D2C skincare · E-commerce",
    summary: "From a template theme to a custom Shopify build with subscription checkout and automated replenishment emails.",
    image: p1,
    alt: "Skincare and beauty products arranged in a clear acrylic organiser",
    reel: "case-1",
    metrics: [
      { v: "+64%", l: "Repeat purchase rate" },
      { v: "1.4s", l: "Largest contentful paint" },
    ],
  },
];

/**
 * Case cards. Hover (or focus) lifts the picture and, where a clip exists, plays its reel preview; metrics count up as
 * the card enters view. Touch: the reel plays in view instead of on hover.
 */
export default function WorkCards() {
  return (
    <section id="work" data-glow aria-labelledby="work-h" className="py-[clamp(80px,11vh,140px)]">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="work-h" data-reveal className="display !text-[clamp(36px,5vw,80px)]">
            Selected work
          </h2>
          <Link href="/work" className="group inline-flex min-h-[44px] items-center gap-2 font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            All projects
            <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>

        <ul className="mt-12 grid gap-5 lg:mt-16 lg:grid-cols-3">
          {CARDS.map((c) => (
            <li key={c.title} data-panel className="group flex flex-col overflow-hidden rounded-xl bg-surface hairline">
              <div data-video-host className="relative aspect-[4/3] overflow-hidden bg-raised">
                <Image
                  src={c.image}
                  alt={c.alt}
                  fill
                  sizes="(min-width:1024px) 33vw, 100vw"
                  placeholder="blur"
                  className="object-cover object-top transition-transform duration-700 ease-[cubic-bezier(.22,1,.36,1)] group-hover:scale-[1.04]"
                />
                {c.reel && (
                  <LoopVideo name={c.reel} label={`${c.title} preview`} trigger="hover" poster={c.image.src} className="absolute inset-0 h-full w-full object-cover" />
                )}
              </div>
              <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
                <h3 className="text-[clamp(24px,2.2vw,30px)] font-semibold leading-tight tracking-[-0.03em]">
                  <Link href={`/work/${c.slug}`} className="underline decoration-transparent underline-offset-[6px] transition-colors hover:decoration-accent">
                    {c.title}
                  </Link>
                </h3>
                <p className="-mt-2 text-[15px] text-muted">{c.sector}</p>
                <p className="text-fg/85">{c.summary}</p>
                <dl className="mt-auto grid grid-cols-2 gap-4 pt-4">
                  {(c.metrics ?? [{ v: "{{METRIC}}", l: "{{RESULT_LABEL}}" }, { v: "{{METRIC}}", l: "{{RESULT_LABEL}}" }]).map((m, i) => (
                    <div key={i} className="flex flex-col-reverse">
                      <dt className="mt-1 text-[15px] text-muted">{m.l}</dt>
                      <dd className="text-[clamp(28px,2.6vw,40px)] font-bold leading-none tracking-[-0.04em]">
                        {c.metrics ? <Counter value={m.v} /> : <span className="text-[17px] font-medium text-muted">{m.v}</span>}
                      </dd>
                    </div>
                  ))}
                </dl>
                {c.url && (
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-[44px] w-fit items-center gap-2 font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent"
                  >
                    View live site <ArrowUpRight size={16} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
