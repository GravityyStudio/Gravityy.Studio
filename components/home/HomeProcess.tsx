"use client";
import { useRef } from "react";
import Link from "@/components/ui/SmartLink";
import { LOCAL } from "@/lib/content";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";

// Each stage starts two columns further right, so the block descends as a staircase. The first line is the heading.
const START = ["lg:col-start-1", "lg:col-start-3", "lg:col-start-5", "lg:col-start-7"];
const INDENT = ["pl-0", "pl-[6vw]", "pl-[12vw]", "pl-[18vw]"];

export default function HomeProcess() {
  const home = useContent().pages.home as typeof LOCAL.pages.home;
  const steps = home.steps ?? LOCAL.pages.home.steps;
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  const line = "text-[9vw] font-medium leading-[1.02] tracking-[-0.04em] sm:text-[clamp(40px,5.2vw,84px)]";

  return (
    <section ref={ref} id="process" data-chapter="dark" aria-labelledby="process-h" className="bg-bg py-[clamp(96px,16vh,200px)]">
      <ol className="container-x flex flex-col gap-10 lg:grid lg:grid-cols-12 lg:gap-x-8 lg:gap-y-14">
        {steps.map((s, i) => {
          const Line = i === 0 ? "h2" : "p";
          return (
            <li key={s.line} data-enter className={`${INDENT[i % 4]} lg:col-end-13 lg:pl-0 ${START[i % 4]}`}>
              <Line id={i === 0 ? "process-h" : undefined} className={`${line} ${i === steps.length - 1 ? "text-accent" : ""}`}>
                {s.line}
              </Line>
              <p className="mt-3 max-w-[34ch] text-[17px] leading-relaxed text-muted">{s.note}</p>
            </li>
          );
        })}
        <li data-enter className={`${INDENT[3]} lg:col-start-7 lg:col-end-13 lg:pl-0`}>
          <Link href="/process" className="text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            The full eight-step process
          </Link>
        </li>
      </ol>
    </section>
  );
}
