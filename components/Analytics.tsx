"use client";
import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useContent } from "./ContentProvider";
import { MOTION } from "@/lib/motion";
import { useReveal } from "@/hooks/useReveal";
import SectionHeading from "./ui/SectionHeading";
import CountUp from "./ui/CountUp";

const Skeleton = () => (
  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
    {[0, 1, 2].map((i) => (
      <div key={i} className={`h-[316px] rounded-2xl bg-raised ${i === 0 ? "md:col-span-2 xl:col-span-1" : ""}`} />
    ))}
  </div>
);
const Charts = dynamic(() => import("./Charts"), { ssr: false, loading: Skeleton });

export default function Analytics() {
  const { site } = useContent();
  const ref = useRef<HTMLElement>(null);
  const board = useRef<HTMLDivElement>(null);
  const [show, setShow] = useState(false);
  useReveal(ref);

  // Load Chart.js only when the dashboard approaches the viewport; charts draw in on mount.
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setShow(true), io.disconnect()), { rootMargin: "0px 0px -15% 0px" });
    if (board.current) io.observe(board.current);
    return () => io.disconnect();
  }, []);

  return (
    <section ref={ref} id="analytics" aria-labelledby="analytics-h" className="section cv">
      <div className="container-x">
        <SectionHeading id="analytics-h" index="07" eyebrow="Analytics" title="See every number that matters, live." lede="Every project ships with tracking and a live dashboard your team can read." />
        <div ref={board} data-card className="card mt-10 flex flex-col gap-5 lg:mt-14 p-4 sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-medium">
              Growth dashboard <span className="font-normal text-muted">· sample client, last 12 weeks</span>
            </p>
            <span className="flex items-center gap-2 font-mono text-xs text-accent">
              <span className="h-2 w-2 animate-pulse rounded-full bg-accent" aria-hidden="true" />
              LIVE
            </span>
          </div>
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {site.metrics.map((m) => (
              <div key={m.label} className="flex flex-col rounded-2xl bg-raised p-5">
                <dt className="text-[13px] text-muted">{m.label}</dt>
                <dd className="mt-2 text-[clamp(24px,3vw,34px)] font-medium tracking-[-0.03em]">
                  <CountUp value={m.value} decimals={m.decimals} prefix={m.prefix} suffix={m.suffix} duration={MOTION.dur.analytics} />
                </dd>
                <dd className="mt-1 text-[13px] text-fg/70">{m.delta}</dd>
              </div>
            ))}
          </dl>
          {show ? <Charts /> : <Skeleton />}
        </div>
      </div>
    </section>
  );
}
