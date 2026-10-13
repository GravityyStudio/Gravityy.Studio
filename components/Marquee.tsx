"use client";
import { useMemo, useRef } from "react";
import { useContent } from "./ContentProvider";
import { gsap, ScrollTrigger, useGSAP } from "@/lib/gsap";
import { MOTION_OK } from "@/lib/motion";

/** Infinite CSS marquee of tool wordmarks; scroll velocity adds a subtle skew. */
export default function Marquee() {
  const ref = useRef<HTMLDivElement>(null);
  const { stack, services } = useContent();
  const TOOLS = useMemo(() => Array.from(new Set([...stack.flatMap((g) => g.items), ...services.flatMap((s) => s.tags)])), [stack, services]);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const skew = gsap.quickTo(ref.current, "skewX", { duration: 0.5, ease: "power3.out" });
        const st = ScrollTrigger.create({
          onUpdate: (s) => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -300)),
        });
        const settle = setInterval(() => skew(0), 200);
        return () => (st.kill(), clearInterval(settle));
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  const Row = ({ hidden }: { hidden?: boolean }) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {TOOLS.map((t) => (
        <li key={t} className="flex items-center whitespace-nowrap px-6 text-[clamp(22px,3vw,40px)] font-medium tracking-[-0.03em] text-fg/60 sm:px-10">
          {t}
          <span aria-hidden="true" className="ml-12 inline-block h-1.5 w-1.5 rounded-full bg-fg/25 sm:ml-20" />
        </li>
      ))}
    </ul>
  );

  return (
    <section aria-label="Tools we use" className="overflow-hidden py-6 sm:py-8">
      <div ref={ref}>
        <div className="marquee-track flex w-max">
          <Row />
          <Row hidden />
        </div>
      </div>
    </section>
  );
}
