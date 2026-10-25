"use client";
import { useRef } from "react";
import Link from "@/components/ui/SmartLink";
import { ArrowUpRight } from "lucide-react";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";

// Eleven services read as eight capabilities: [service page, short name]. Descriptions come from the CMS.
const ROWS: [string, string][] = [
  ["web", "Websites"],
  ["app", "Web apps & SaaS"],
  ["mobile", "Mobile apps"],
  ["ecom", "E-commerce"],
  ["uiux", "Brand & UI/UX"],
  ["auto", "Automation & CRM"],
  ["data", "Analytics & SEO"],
  ["cloud", "Cloud & DevOps"],
];

/** Capabilities at poster scale: the list is the picture. On hover the other names step back to the soft ink. */
export default function HomeServices() {
  const { services } = useContent();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  const name = "text-[9vw] font-medium leading-none tracking-[-0.045em] sm:text-[clamp(40px,5.2vw,84px)]";

  return (
    <section ref={ref} id="services" data-chapter="paper" aria-labelledby="services-h" className="chapter-paper py-[clamp(96px,18vh,200px)]">
      <div className="container-x">
        <h2 id="services-h" data-enter className={`${name} text-muted`}>
          What we build
        </h2>
        <ul className="mt-[0.35em] flex flex-col [&:has(a:hover)_a:not(:hover)_.cap]:text-muted">
          {ROWS.map(([id, label]) => {
            const s = services.find((x) => x.id === id);
            return (
              <li key={id} data-enter>
                <Link href={`/services/${id}`} className="group grid gap-3 py-[0.18em] max-lg:pb-6 lg:grid-cols-12 lg:items-baseline lg:gap-8">
                  <span className={`cap ${name} transition-colors duration-300 lg:col-span-8`}>
                    {label}
                    <ArrowUpRight aria-hidden="true" className="ml-2 inline h-[0.5em] w-[0.5em] -translate-y-[0.1em] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100" />
                  </span>
                  {s && <span className="max-w-[48ch] pl-4 text-[17px] leading-snug text-muted lg:col-span-4 lg:pl-0">{s.desc}</span>}
                </Link>
              </li>
            );
          })}
        </ul>
        <p data-enter className="mt-14 text-[17px]">
          <Link href="/services" className="font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            All eleven services, with tools and a live estimate
          </Link>
        </p>
      </div>
    </section>
  );
}
