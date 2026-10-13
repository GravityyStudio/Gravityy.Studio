"use client";
import { useRef } from "react";
import Link from "@/components/ui/SmartLink";
import { gsap, useGSAP } from "@/lib/gsap";
import { MOTION, MOTION_OK } from "@/lib/motion";

type Props = { eyebrow: string; title: string; lede: string; crumbs?: [string, string][] };

/** Subpage header: breadcrumb, h1 with a masked rise, lede. One soft lime glow; content static under reduced motion. */
export default function PageHero({ eyebrow, title, lede, crumbs = [] }: Props) {
  const ref = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: MOTION.ease.expo } })
          .from("[data-ph-line]", { yPercent: 110, duration: MOTION.dur.heroLine })
          .from("[data-ph-fade]", { opacity: 0, y: 18, duration: 0.7, stagger: 0.08, ease: MOTION.ease.out }, "-=0.5");
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} aria-labelledby="page-h" className="relative overflow-hidden pb-[clamp(56px,8vw,112px)] pt-[clamp(140px,18vw,220px)]">
      <div aria-hidden="true" className="glow pointer-events-none absolute -right-[25vw] -top-[30vw] aspect-square w-[80vw] max-w-[900px] opacity-70" />
      <div className="container-x relative">
        <nav aria-label="Breadcrumb" data-ph-fade>
          {/* Single line (last crumb truncates) so its height never changes when the mono webfont swaps in (no CLS). */}
          <ol className="flex min-w-0 items-center gap-2 whitespace-nowrap font-mono text-xs uppercase tracking-[0.14em] text-muted">
            <li className="shrink-0">
              <Link href="/" className="transition-colors hover:text-fg">
                Home
              </Link>
            </li>
            {crumbs.map(([label, href], i) => (
              <li key={href} className={`flex items-center gap-2 ${i === crumbs.length - 1 ? "min-w-0" : "shrink-0"}`}>
                <span aria-hidden="true">/</span>
                {i === crumbs.length - 1 ? (
                  <span aria-current="page" className="truncate text-fg/80">
                    {label}
                  </span>
                ) : (
                  <Link href={href} className="transition-colors hover:text-fg">
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <p data-ph-fade className="mt-10 font-mono text-xs uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </p>
        <h1 id="page-h" className="mt-4 overflow-hidden pb-[0.06em] text-[clamp(48px,9vw,128px)] font-medium leading-[0.95] tracking-[-0.045em]">
          <span data-ph-line className="block">
            {title}
          </span>
        </h1>
        <p data-ph-fade className="mt-8 max-w-[640px] text-lg leading-relaxed text-muted sm:text-xl">
          {lede}
        </p>
      </div>
    </section>
  );
}
