"use client";
import { useRef, type CSSProperties } from "react";
import Image, { type StaticImageData } from "next/image";
import { ArrowUpRight } from "lucide-react";
import { useContent } from "./ContentProvider";
import p1 from "@/public/media/case-1-poster.jpg";
import p2 from "@/public/media/case-2-poster.jpg";
import p3 from "@/public/media/case-3-poster.jpg";
import p4 from "@/public/media/case-4-poster.jpg";
import viara from "@/public/media/work-viara.jpg";
import athlex from "@/public/media/work-athlex.jpg";
import { gsap } from "@/lib/gsap";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";
import { useReveal } from "@/hooks/useReveal";
import SectionHeading from "./ui/SectionHeading";
import LoopVideo from "./ui/LoopVideo";

const POSTERS: Record<string, StaticImageData> = { viara, athlex, "case-1": p1, "case-2": p2, "case-3": p3, "case-4": p4 };

/** Sticky stacked case cards on lg+: each card scales back as the next one slides over it. Stacked reveals below lg. */
type More = { href: string; label: string };

export default function CaseStack({ limit, more }: { limit?: number; more?: More }) {
  const { cases } = useContent();
  const list = cases.slice(0, limit);
  const ref = useRef<HTMLElement>(null);
  useReveal(ref, "[data-card-mobile]");

  useLazyGSAP(ref, () => {
      const mm = gsap.matchMedia();
      mm.add("(min-width: 1024px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-case]", ref.current);
        cards.slice(0, -1).forEach((card, i) => {
          gsap.to(card.querySelector("[data-case-inner]"), {
            scale: 0.9,
            filter: "brightness(0.45)",
            ease: "none",
            scrollTrigger: { trigger: cards[i + 1], start: "top bottom", end: "top 20%", scrub: true },
          });
        });
      });
      return () => mm.revert();
  });

  return (
    <section ref={ref} id="work" aria-labelledby="work-h" className="section max-lg:[content-visibility:auto] max-lg:[contain-intrinsic-size:auto_3200px]">
      <div className="container-x">
        <SectionHeading id="work-h" index="04" eyebrow="Case studies" title="Systems that moved the numbers." lede="Recent builds and the results they produced." more={more} />
        <ol className="mt-10 flex flex-col gap-6 lg:mt-14 lg:gap-[12vh]">
          {list.map((c, i) => (
            <li key={c.slug} data-case className="lg:sticky lg:top-[var(--top)]" style={{ "--top": `${104 + i * 18}px` } as CSSProperties}>
              <article data-case-inner data-card-mobile className="card grid origin-top overflow-hidden lg:min-h-[min(640px,76vh)] lg:grid-cols-[1.35fr_1fr]">
                <div data-video-host data-cursor="view" className="theme-dark group relative aspect-[16/10] overflow-hidden bg-raised lg:aspect-auto">
                  <Image
                    src={POSTERS[c.slug]}
                    alt={c.alt}
                    fill
                    sizes="(min-width:1024px) 60vw, 100vw"
                    placeholder="blur"
                    className={`object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none ${c.video ? "" : "object-left-top"}`}
                  />
                  {c.video ? (
                    <LoopVideo name={c.slug} label={`${c.title} preview`} trigger="hover" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    // Live-site screenshot: the whole image opens the project (duplicate of the text link, so hidden from AT/tab order).
                    <a href={c.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" className="absolute inset-0" />
                  )}
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                  <span className={`pointer-events-none absolute left-5 flex items-center gap-3 font-mono text-xs text-fg/80 ${c.video ? "top-5" : "bottom-5"}`}>
                    {String(i + 1).padStart(2, "0")} / {String(list.length).padStart(2, "0")}
                    {!c.video && (
                      <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-black/50 px-2.5 py-1 backdrop-blur-md">
                        <span className="h-1.5 w-1.5 rounded-full bg-accent" aria-hidden="true" />
                        Live
                      </span>
                    )}
                  </span>
                </div>
                <div className="flex flex-col gap-4 p-7 sm:p-9 lg:p-10">
                  <p className="font-mono text-xs uppercase tracking-[0.12em] text-muted">{c.sector}</p>
                  <h3 className="text-[clamp(26px,2.6vw,36px)] font-medium leading-[1.1] tracking-[-0.03em]">{c.title}</h3>
                  <p className="text-[15px] leading-relaxed text-muted">{c.summary}</p>
                  {"metrics" in c && c.metrics ? (
                    <dl className="mt-4 grid grid-cols-2 gap-6 border-t border-line pt-6">
                      {c.metrics.map((m) => (
                        <div key={m.l} className="flex flex-col-reverse gap-1">
                          <dt className="text-[13px] text-muted">{m.l}</dt>
                          <dd className="text-[clamp(30px,3vw,40px)] font-medium tracking-[-0.04em]">{m.v}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <ul aria-label="What we built" className="mt-4 flex flex-wrap gap-2 border-t border-line pt-6">
                      {"tags" in c &&
                        c.tags?.map((t) => (
                          <li key={t} className="rounded-full border border-line px-3.5 py-1.5 text-[13px] text-fg/85">
                            {t}
                          </li>
                        ))}
                    </ul>
                  )}
                  <a href={c.url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex min-h-[44px] items-center gap-2 pt-4 text-[15px] font-medium hover:text-accent">
                    View live project <ArrowUpRight size={18} aria-hidden="true" />
                    <span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </div>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
