"use client";
import { useRef } from "react";
import Image from "next/image";
import { m, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import Counter from "@/components/ui/Counter";
import LoopVideo from "@/components/ui/LoopVideo";
import { posterFor, type Case } from "@/lib/casePosters";

const SPRING = { stiffness: 220, damping: 22, mass: 0.6 };

/**
 * Project card. On a fine pointer it tilts toward the cursor (Framer springs, transform only) and lifts with a glow;
 * where a clip exists its reel plays on hover. Metrics count up as the card enters view; projects without measured
 * results show labelled placeholders. The whole card links to the case study (stretched link); "Live site" sits above it.
 */
export default function WorkCard({ c, priority = false }: { c: Case; priority?: boolean }) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateY = useSpring(useTransform(px, [0, 1], [-6, 6]), SPRING);
  const rotateX = useSpring(useTransform(py, [0, 1], [5, -5]), SPRING);
  const poster = posterFor(c.slug);
  const name = c.title.split(":")[0];
  const live = c.url && !c.url.includes("gravityystudio.com");

  const move = (e: React.PointerEvent) => {
    if (reduce || e.pointerType !== "mouse" || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const leave = () => (px.set(0.5), py.set(0.5));

  return (
    <m.article
      ref={ref}
      data-video-host
      onPointerMove={move}
      onPointerLeave={leave}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1100 }}
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ type: "spring", ...SPRING }}
      className="group relative flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-hairline transition-shadow duration-[400ms] hover:shadow-glow-card"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-raised">
        <Image
          src={poster}
          alt={c.alt}
          fill
          priority={priority}
          sizes="(min-width:1024px) 33vw, (min-width:640px) 50vw, 100vw"
          placeholder="blur"
          className="object-cover object-top transition-transform duration-700 ease-brand group-hover:scale-[1.05]"
        />
        {c.video && <LoopVideo name={c.slug} label={`${name} preview`} trigger="hover" poster={poster.src} className="absolute inset-0 h-full w-full object-cover" />}
        <span className="pointer-events-none absolute left-4 top-4 rounded-pill bg-bg/70 px-3 py-1 text-[13px] font-semibold backdrop-blur-sm">{c.sector}</span>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-6 sm:p-7">
        <h3 className="text-[clamp(22px,2vw,28px)] font-semibold leading-tight tracking-[-0.03em]">
          <Link href={`/work/${c.slug}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-none focus-visible:after:rounded-xl focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-accent">
            {name}
          </Link>
        </h3>
        <p className="line-clamp-3 text-fg/80">{c.summary}</p>
        {!!c.tags?.length && (
          <ul aria-label="Scope" className="flex flex-wrap gap-2">
            {c.tags.slice(0, 3).map((t) => (
              <li key={t} className="rounded-pill px-3 py-1 text-[13px] text-fg/80 shadow-hairline">
                {t}
              </li>
            ))}
          </ul>
        )}
        <dl className="mt-auto grid grid-cols-2 gap-4 pt-2">
          {(c.metrics ?? [
            { v: "{{METRIC}}", l: "{{RESULT_LABEL}}" },
            { v: "{{METRIC}}", l: "{{RESULT_LABEL}}" },
          ]).map((mt, i) => (
            <div key={i} className="flex flex-col-reverse">
              <dt className="mt-1 text-[14px] text-muted">{mt.l}</dt>
              <dd className="text-[clamp(26px,2.4vw,36px)] font-bold leading-none tracking-[-0.04em]">
                {c.metrics ? <Counter value={mt.v} /> : <span className="text-[16px] font-medium text-muted">{mt.v}</span>}
              </dd>
            </div>
          ))}
        </dl>
        <div className="flex items-center justify-between gap-4 pt-2">
          <span aria-hidden="true" className="inline-flex items-center gap-2 font-semibold">
            Case study
            <span className="grid h-9 w-9 place-items-center rounded-pill shadow-hairline transition-[transform,background-color,color] duration-500 ease-brand group-hover:-rotate-45 group-hover:bg-accent group-hover:text-on-accent">
              →
            </span>
          </span>
          {live && (
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="relative z-10 inline-flex min-h-[44px] items-center gap-1 text-[15px] text-muted underline decoration-fg/30 underline-offset-4 hover:text-fg hover:decoration-accent">
              Live site <ArrowUpRight size={14} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
        </div>
      </div>
    </m.article>
  );
}
