"use client";
import { ArrowRight } from "lucide-react";
import { useFormSubmit } from "@/hooks/useFormSubmit";
import Honeypot from "./ui/Honeypot";

/** Compact footer signup: title, then a pill input with an inline round submit button. */
export default function FooterNewsletter() {
  const { status, onSubmit, invalid } = useFormSubmit("/api/newsletter", "newsletterSchema");

  return (
    <form onSubmit={onSubmit} noValidate aria-labelledby="news-h" className="relative flex w-full max-w-[420px] flex-col gap-3">
      <Honeypot />
      <h2 id="news-h" className="font-semibold tracking-[-0.01em] text-fg">
        Growth notes, once a month
      </h2>
      <div className="flex items-center gap-2 rounded-pill bg-bg py-1.5 pl-5 pr-1.5 hairline transition-shadow focus-within:shadow-[inset_0_0_0_2px_rgb(var(--accent))]">
        <label htmlFor="news-email" className="sr-only">
          Email
        </label>
        <input
          id="news-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@company.com"
          aria-invalid={invalid("email")}
          aria-describedby="news-status"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-fg outline-none focus-visible:outline-none"
        />
        <button
          type="submit"
          disabled={status.pending}
          aria-label="Subscribe"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent transition-transform duration-200 hover:scale-105 disabled:opacity-50 motion-reduce:hover:scale-100"
        >
          <ArrowRight size={18} aria-hidden="true" />
        </button>
      </div>
      <p id="news-status" role="status" className={`min-h-5 text-[15px] ${status.ok ? "text-accent" : "text-danger"}`}>
        {status.msg}
      </p>
    </form>
  );
}
