"use client";
import { useRef, type ReactNode } from "react";
import Link from "@/components/ui/SmartLink";
import { ArrowRight } from "lucide-react";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { MOTION, prefersReduced } from "@/lib/motion";
import { onNear } from "@/lib/onNear";

type Props = { id: string; index: string; eyebrow: string; title: ReactNode; lede?: string; className?: string; more?: { href: string; label: string } };

/** Eyebrow + h2 with a line-by-line masked reveal on enter + lede. */
export default function SectionHeading({ id, index, eyebrow, title, lede, className = "", more }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    (_, contextSafe) => {
      if (prefersReduced()) return;
      const h = ref.current?.querySelector("h2");
      if (!h) return;
      // Split lazily (shortly before the heading scrolls in) so load-time layout work stays small.
      const run = contextSafe!(() => {
        SplitText.create(h, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (self) =>
            gsap.from(self.lines, {
              yPercent: 110,
              duration: MOTION.dur.heading,
              ease: MOTION.ease.expo,
              stagger: MOTION.stagger.lines,
              scrollTrigger: { trigger: h, start: "top 85%", once: true },
            }),
        });
        gsap.from(ref.current!.querySelectorAll("[data-fade]"), {
          opacity: 0,
          y: 16,
          duration: MOTION.dur.card,
          ease: MOTION.ease.out,
          delay: 0.2,
          scrollTrigger: { trigger: h, start: "top 85%", once: true },
        });
      });
      return onNear(h, run);
    },
    { scope: ref },
  );

  return (
    <div ref={ref} className={`max-w-[860px] ${className}`}>
      <p data-fade className="mb-6 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-muted">
        <span className="text-fg/50">{index}</span>
        <span aria-hidden="true" className="h-px w-8 bg-line" />
        {eyebrow}
      </p>
      <h2 id={id} className="text-h2">
        {title}
      </h2>
      {lede && (
        <p data-fade className="mt-6 max-w-[620px] text-[17px] leading-relaxed text-muted sm:text-lg">
          {lede}
        </p>
      )}
      {more && (
        <Link data-fade href={more.href} className="group mt-6 inline-flex min-h-[44px] items-center gap-2 text-[15px] font-medium text-fg">
          <span className="border-b border-fg/30 pb-0.5 transition-colors group-hover:border-accent">{more.label}</span>
          <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
