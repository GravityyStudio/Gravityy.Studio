"use client";
import { useRef } from "react";
import Link from "@/components/ui/SmartLink";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";

/** Answers as reading text: each question is the run-in opening of its paragraph, everything answered at a glance. */
export default function HomeFaq() {
  const { faq, site } = useContent();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);

  return (
    <section ref={ref} id="faq" data-chapter="dark" aria-labelledby="faq-h" className="bg-surface py-[clamp(96px,14vh,160px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-x-8">
        <div data-enter className="flex flex-col gap-4 lg:col-span-3">
          <h2 id="faq-h" className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em]">
            Questions
          </h2>
          <Link href="/faq" className="w-fit text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            All questions
          </Link>
        </div>
        <div className="text-[17px] leading-[1.55] md:columns-2 md:gap-14 lg:col-span-8 lg:col-start-5">
          {faq.map((f) => (
            <p key={f.q} data-enter className="mb-5 break-inside-avoid">
              <strong className="font-medium">{f.q}</strong> <span className="text-fg/80">{f.a}</span>
            </p>
          ))}
          <p data-enter className="break-inside-avoid text-fg/80">
            <strong className="font-medium text-fg">Something else?</strong> Write to{" "}
            <a href={`mailto:${site.email}`} className="underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              {site.email}
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
