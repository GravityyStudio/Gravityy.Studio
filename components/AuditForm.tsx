"use client";
import { useEffect, useRef, useState } from "react";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import Button from "./ui/Button";
import Honeypot from "./ui/Honeypot";

const STEPS = ["Send your website and work email.", "We review its speed, SEO and conversion path.", "You get a written report within 3 working days. No call needed."];

/**
 * The free audit (POST /api/audit, same zod schema client and server). The one audit form on every page: #audit.
 * States: default; focus (accent ring); invalid (field outline + message tied by aria-describedby, focus moves there on
 * submit); loading (button busy); error (role=status message); success (form replaced by a confirmation).
 */
export default function AuditForm() {
  const [done, setDone] = useState(false);
  const audit = useFormSubmit("/api/audit", "auditSchema", () => setDone(true));
  const err = (name: string) => (audit.invalid(name) ? audit.status.msg : "");
  const form = useRef<HTMLFormElement>(null);
  // On a failed submit, move focus to the field that needs fixing (its message is announced via aria-describedby).
  useEffect(() => {
    const f = audit.status.field;
    if (f && !audit.status.ok) (form.current?.elements.namedItem(f) as HTMLInputElement | null)?.focus();
  }, [audit.status]);
  const field =
    "min-h-[56px] w-full rounded-md bg-bg px-5 text-[16px] text-fg hairline transition-shadow placeholder:text-placeholder focus:outline-none focus-visible:shadow-[inset_0_0_0_2px_rgb(var(--accent))] aria-[invalid=true]:shadow-[inset_0_0_0_2px_rgb(var(--danger))]";

  return (
    <div id="audit" className="grid gap-10 lg:grid-cols-12 lg:gap-x-10">
      <div className="flex flex-col gap-6 lg:col-span-5">
        <h2 data-reveal className="display !text-[clamp(30px,4vw,56px)]">Get a free audit</h2>
        <ol className="flex flex-col gap-3">
          {STEPS.map((s, i) => (
            <li key={s} className="flex gap-4">
              <span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-pill bg-accent text-[13px] font-bold text-on-accent">
                {i + 1}
              </span>
              <span className="text-fg/85">{s}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="lg:col-span-6 lg:col-start-7">
        {done ? (
          <div role="status" className="flex flex-col items-start gap-4 rounded-xl bg-surface p-7 hairline sm:p-9">
            <p className="text-[clamp(22px,2vw,28px)] font-semibold">Request received.</p>
            <p className="text-fg/85">{audit.status.msg || "Your audit will arrive within 3 working days."}</p>
            <Button variant="ghost" onClick={() => setDone(false)}>
              Audit another site
            </Button>
          </div>
        ) : (
          <form ref={form} onSubmit={audit.onSubmit} noValidate aria-label="Free audit request" className="flex flex-col gap-5 rounded-xl bg-surface p-6 hairline sm:p-9">
            <Honeypot />
            <label className="flex flex-col gap-2 font-semibold">
              Website URL
              <input
                type="url"
                name="url"
                inputMode="url"
                autoComplete="url"
                placeholder="yourcompany.com"
                required
                aria-invalid={audit.invalid("url")}
                aria-describedby={err("url") ? "audit-url-err" : undefined}
                className={field}
              />
              {err("url") && (
                <span id="audit-url-err" className="text-[15px] font-normal text-danger">
                  {err("url")}
                </span>
              )}
            </label>
            <label className="flex flex-col gap-2 font-semibold">
              Work email
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@company.com"
                required
                aria-invalid={audit.invalid("email")}
                aria-describedby={err("email") ? "audit-email-err" : undefined}
                className={field}
              />
              {err("email") && (
                <span id="audit-email-err" className="text-[15px] font-normal text-danger">
                  {err("email")}
                </span>
              )}
            </label>
            {/* Server or network errors (not tied to a field) */}
            <p role="status" className="min-h-6 text-[15px] text-danger">
              {!audit.status.ok && !audit.status.pending && !audit.status.field ? audit.status.msg : ""}
            </p>
            <Button type="submit" variant="accent" loading={audit.status.pending} className="sm:self-start">
              {audit.status.pending ? "Sending…" : "Send my free audit"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
