"use client";
import { useRef } from "react";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { useReveal } from "@/hooks/useReveal";
import { gsap, SplitText, useGSAP } from "@/lib/gsap";
import { MOTION, prefersReduced } from "@/lib/motion";
import { onNear } from "@/lib/onNear";
import { useUI } from "./Providers";
import Button from "./ui/Button";
import Honeypot from "./ui/Honeypot";

function Status({ ok, msg }: { ok: boolean; msg: string }) {
  return (
    <p role="status" className={`min-h-5 text-sm ${ok ? "text-accent" : "text-danger"}`}>
      {msg}
    </p>
  );
}

export default function FinalCTA({ level = "h2" }: { level?: "h1" | "h2" }) {
  const Heading = level;
  const ref = useRef<HTMLElement>(null);
  const { openContact } = useUI();
  const audit = useFormSubmit("/api/audit", "auditSchema");
  useReveal(ref);

  useGSAP(
    (_, contextSafe) => {
      if (prefersReduced()) return;
      const h = ref.current?.querySelector("#cta-h");
      const run = contextSafe!(() => {
        SplitText.create(h!, {
          type: "lines",
          mask: "lines",
          autoSplit: true,
          onSplit: (s) => gsap.from(s.lines, { yPercent: 110, duration: MOTION.dur.heading, ease: MOTION.ease.expo, stagger: MOTION.stagger.lines, scrollTrigger: { trigger: h, start: "top 85%", once: true } }),
        });
      });
      return onNear(h, run);
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="contact" aria-labelledby="cta-h" className="section cv overflow-hidden">
      <div aria-hidden="true" className="glow pointer-events-none absolute -left-[20vw] bottom-[-20%] -z-10 aspect-square w-[80vw] max-w-[1000px] opacity-60" />
      <div className="container-x">
        <Heading id="cta-h" className="max-w-[1180px] text-[clamp(40px,7vw,108px)] font-medium leading-[0.95] tracking-[-0.045em]">
          YOUR BUSINESS HAS A GOAL. <span className="text-accent">LET&apos;S BUILD THE SYSTEM BEHIND IT.</span>
        </Heading>
        <div data-card className="mt-10 flex flex-wrap gap-3">
          <Button onClick={() => openContact()}>
            Start a Project
          </Button>
          <Button href="#audit" variant="ghost">
            Get a free audit
          </Button>
        </div>

        <form
          id="audit"
          data-card
          onSubmit={audit.onSubmit}
          noValidate
          aria-labelledby="audit-h"
          className="glass relative mt-12 grid lg:mt-16 gap-8 rounded-card border border-line p-7 sm:p-9 lg:grid-cols-[1fr_1.2fr] lg:gap-14 lg:p-12"
        >
          <Honeypot />
          <div className="flex flex-col gap-3">
            <h3 id="audit-h" className="text-2xl font-medium tracking-[-0.03em] lg:text-3xl">Get a free audit</h3>
            <p className="text-[15px] leading-relaxed text-muted">We review your site&apos;s speed, SEO and conversion path and send a written report within 3 working days.</p>
          </div>
          <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-2 text-sm font-medium">
                Work email
                <input type="email" name="email" autoComplete="email" placeholder="you@company.com" className="field" aria-invalid={audit.invalid("email")} />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium">
                Website URL
                <input type="url" name="url" placeholder="https://yourcompany.com" className="field" aria-invalid={audit.invalid("url")} />
              </label>
            </div>
            <Status {...audit.status} />
            <Button type="submit" disabled={audit.status.pending} className="sm:self-start">
              Request audit
            </Button>
          </div>
        </form>      </div>
    </section>
  );
}
