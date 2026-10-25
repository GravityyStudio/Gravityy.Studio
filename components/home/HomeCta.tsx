"use client";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import { useUI } from "../Providers";
import Button from "../ui/Button";
import Honeypot from "../ui/Honeypot";

/** The free audit as a sentence with blanks: the gaps are the fields and its last word sends it (same /api/audit).
 * Static on purpose: a form should be there the moment someone reaches it. */
export default function HomeCta() {
  const { openContact } = useUI();
  const audit = useFormSubmit("/api/audit", "auditSchema");
  const blank =
    "mx-[0.15em] inline-block h-[1.35em] rounded-2xl border-0 bg-raised px-[0.45em] align-baseline text-[length:inherit] text-fg placeholder:text-placeholder focus:outline-none focus-visible:outline-2 focus-visible:outline-accent aria-[invalid=true]:outline aria-[invalid=true]:outline-2 aria-[invalid=true]:outline-danger max-sm:my-2 max-sm:w-full";

  return (
    <section id="contact" data-chapter="dark" aria-labelledby="cta-h" className="bg-bg py-[clamp(96px,16vh,200px)]">
      <div className="container-x">
        <h2 id="cta-h" className="max-w-[16ch] text-[9vw] sm:text-[clamp(40px,5.2vw,84px)] font-semibold leading-[0.95] tracking-[-0.045em]">
          Let&apos;s see what your site can do.
        </h2>
        <form onSubmit={audit.onSubmit} noValidate aria-labelledby="cta-h" className="mt-12 max-w-[1100px] lg:mt-16">
          <Honeypot />
          <p className="text-[20px] font-medium leading-[1.6] tracking-[-0.02em] sm:text-[32px]">
            Audit{" "}
            <label>
              <span className="sr-only">Website URL</span>
              <input type="url" name="url" placeholder="yourcompany.com" className={`${blank} sm:w-[9.5em]`} aria-invalid={audit.invalid("url")} />
            </label>{" "}
            for free and send the report to{" "}
            <label>
              <span className="sr-only">Work email</span>
              <input type="email" name="email" autoComplete="email" placeholder="you@company.com" className={`${blank} sm:w-[9.5em]`} aria-invalid={audit.invalid("email")} />
            </label>{" "}
            <button
              type="submit"
              disabled={audit.status.pending}
              className="mx-[0.15em] inline-block h-[1.35em] rounded-2xl bg-accent px-[0.5em] align-baseline font-medium text-bg transition-[filter,transform] duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-50 max-sm:mt-2"
            >
              send it
            </button>
            .
          </p>
          <p role="status" className={`mt-5 min-h-6 text-[17px] ${audit.status.ok ? "text-accent" : "text-danger"}`}>
            {audit.status.msg}
          </p>
        </form>
        <div className="mt-6 flex flex-col items-start gap-6">
          <p className="max-w-[52ch] text-[17px] text-muted">A written report on speed, SEO and your conversion path, within 3 working days. No call needed.</p>
          <Button onClick={() => openContact()} variant="primary">
            Or start a project
          </Button>
        </div>
      </div>
    </section>
  );
}
