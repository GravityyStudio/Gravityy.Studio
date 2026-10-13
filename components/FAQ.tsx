"use client";
import { useState } from "react";
import { Plus } from "lucide-react";
import { useContent } from "./ContentProvider";
import SectionHeading from "./ui/SectionHeading";

/** Accordion: one open at a time, 0.4s height transition via grid-template-rows (no JS measuring). */
type More = { href: string; label: string };

export default function FAQ({ limit, more }: { limit?: number; more?: More }) {
  const { faq } = useContent();
  const [open, setOpen] = useState(0);
  return (
    <section id="faq" aria-labelledby="faq-h" className="section cv">
      <div className="container-x grid gap-12 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <SectionHeading id="faq-h" index="11" eyebrow="FAQ" title="Questions, answered." more={more} />
          <p className="mt-6 text-[17px] leading-relaxed text-muted">
            Can’t find what you need? Write to{" "}
            <a href="mailto:hello@gravityystudio.com" className="text-fg underline decoration-line underline-offset-4 hover:decoration-fg">
              hello@gravityystudio.com
            </a>
            .
          </p>
        </div>
        <div className="border-t border-line">
          {faq.slice(0, limit).map((q, i) => {
            const isOpen = open === i;
            return (
              <div key={q.q} className="border-b border-line">
                <h3>
                  <button
                    type="button"
                    id={`faq-b${i}`}
                    aria-expanded={isOpen}
                    aria-controls={`faq-p${i}`}
                    onClick={() => setOpen(isOpen ? -1 : i)}
                    className="flex min-h-[64px] w-full items-center justify-between gap-6 py-6 text-left text-lg font-medium tracking-[-0.02em]"
                  >
                    {q.q}
                    <span aria-hidden="true" className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line-strong transition-transform duration-[400ms] ${isOpen ? "rotate-45" : ""}`}>
                      <Plus size={16} />
                    </span>
                  </button>
                </h3>
                <div id={`faq-p${i}`} role="region" aria-labelledby={`faq-b${i}`} className={`grid transition-[grid-template-rows] duration-[400ms] ease-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}>
                  <div className="overflow-hidden" inert={!isOpen}>
                    <p className="pb-6 pr-12 text-base leading-relaxed text-muted">{q.a}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
