import Link from "@/components/ui/SmartLink";
import { ArrowUpRight } from "lucide-react";

const ROWS: { label: string; href: string; desc: string }[] = [
  { label: "Websites", href: "/services/web", desc: "Fast, accessible marketing sites with a CMS your team can actually edit." },
  { label: "Web & mobile apps", href: "/services/app", desc: "Portals, SaaS and cross-platform apps with auth, billing and roles built in." },
  { label: "Automation", href: "/services/auto", desc: "Lead capture, CRM sync and follow-ups that run without anyone pressing send." },
  { label: "Analytics", href: "/services/data", desc: "Event tracking and live dashboards, so every decision has a number behind it." },
];

/**
 * Four service rows at display size. Hover or keyboard focus rolls the label up to a second copy (transform only) and
 * turns the arrow; the copy is aria-hidden so screen readers hear each name once. Touch: a tap simply follows the link.
 */
export default function ServiceRows() {
  return (
    <section id="services" data-glow aria-labelledby="services-h" className="py-[clamp(96px,14vh,180px)]">
      <div className="container-x">
        <h2 id="services-h" data-reveal className="mb-10 text-[15px] font-medium text-muted lg:mb-14">
          What we build
        </h2>
        <ul className="flex flex-col">
          {ROWS.map((r) => (
            <li key={r.href} data-panel>
              <Link
                href={r.href}
                className="group grid gap-3 py-5 shadow-[inset_0_-1px_0_var(--hairline)] md:grid-cols-12 md:items-center md:gap-8 md:py-7"
              >
                <span className="display relative block overflow-hidden !text-[clamp(36px,6vw,96px)] md:col-span-8">
                  <span className="block transition-transform duration-[600ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none">
                    {r.label}
                  </span>
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 top-full block text-accent transition-transform duration-[600ms] ease-[cubic-bezier(.22,1,.36,1)] group-hover:-translate-y-full group-focus-visible:-translate-y-full motion-reduce:transition-none"
                  >
                    {r.label}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-6 md:col-span-4">
                  <span className="max-w-[36ch] text-muted">{r.desc}</span>
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-pill hairline transition-[transform,background-color] duration-500 ease-[cubic-bezier(.22,1,.36,1)] group-hover:rotate-45 group-hover:bg-accent group-hover:text-bg group-focus-visible:rotate-45">
                    <ArrowUpRight size={20} aria-hidden="true" />
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
