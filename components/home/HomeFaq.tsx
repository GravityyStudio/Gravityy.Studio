"use client";
import { useId, useState } from "react";
import Link from "@/components/ui/SmartLink";
import { Plus } from "lucide-react";
import { useContent } from "../ContentProvider";

/**
 * FAQ accordion. Each question is a real <button> with aria-expanded + aria-controls; Enter/Space toggle it, Tab moves
 * between questions. Answers stay in the HTML (hidden attribute when closed) so FAQPage structured data matches the
 * page. The opening answer fades and lifts in (transform + opacity); the icon turns 45°.
 */
export default function HomeFaq({ heading = "Questions", allLink = true }: { heading?: string; allLink?: boolean }) {
  const { faq, site } = useContent();
  const [open, setOpen] = useState<number | null>(0);
  const base = useId();

  return (
    <section id="faq" data-glow aria-labelledby="faq-h" className="py-[clamp(80px,11vh,140px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-x-8">
        <div className="flex flex-col gap-5 lg:col-span-4">
          <h2 id="faq-h" data-reveal className="display !text-[clamp(36px,5vw,80px)]">
            {heading}
          </h2>
          <p className="text-muted">
            Something else? Write to{" "}
            <a href={`mailto:${site.email}`} className="text-fg underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              {site.email}
            </a>
          </p>
          {allLink && (
            <Link href="/faq" className="inline-flex min-h-[44px] w-fit items-center font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              All questions
            </Link>
          )}
        </div>
        <ul className="flex flex-col lg:col-span-8">
          {faq.map((f, i) => {
            const on = open === i;
            const id = `${base}-${i}`;
            return (
              <li key={f.q} className="shadow-[inset_0_-1px_0_var(--hairline)]">
                <h3>
                  <button
                    type="button"
                    aria-expanded={on}
                    aria-controls={id}
                    onClick={() => setOpen(on ? null : i)}
                    className="group flex min-h-[64px] w-full items-center justify-between gap-6 py-5 text-left text-[clamp(18px,1.6vw,22px)] font-semibold tracking-[-0.02em]"
                  >
                    {f.q}
                    <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-pill hairline transition-[transform,background-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:bg-fg/[0.06] ${on ? "rotate-45 bg-accent text-on-accent group-hover:bg-accent" : ""}`}>
                      <Plus size={18} aria-hidden="true" />
                    </span>
                  </button>
                </h3>
                <div id={id} role="region" aria-label={f.q} hidden={!on}>
                  <p className="step-swap max-w-[64ch] pb-7 text-fg/85">{f.a}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
