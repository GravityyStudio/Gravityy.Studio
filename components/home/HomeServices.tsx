"use client";
import { useRef } from "react";
import Link from "@/components/ui/SmartLink";
import { ArrowUpRight } from "lucide-react";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";

// Home: eleven services read as eight capabilities: [service page, short name]. Descriptions come from the CMS.
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

export type PosterItem = { label: string; desc: string; href?: string };
type Props = { id?: string; heading?: string; items?: PosterItem[]; more?: { href: string; label: string } | null; chapter?: "paper" | "dark" };

/** A list at poster scale: the list is the picture. On hover the other names step back to the soft ink. */
export default function HomeServices({
  id = "services",
  heading = "What we build",
  items,
  more = { href: "/services", label: "All eleven services, with tools and a live estimate" },
  chapter = "paper",
}: Props) {
  const { services } = useContent();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  const rows =
    items ??
    ROWS.flatMap(([sid, label]) => {
      const s = services.find((x) => x.id === sid);
      return s ? [{ label, desc: s.desc, href: `/services/${sid}` }] : [];
    });
  const name = "text-[9vw] font-medium leading-none tracking-[-0.045em] sm:text-[clamp(40px,5.2vw,84px)]";
  const row = "group grid gap-3 py-[0.18em] max-md:pb-6 md:grid-cols-12 md:items-baseline md:gap-8";
  const desc = "max-w-[48ch] pl-4 text-[17px] leading-snug text-muted md:col-span-5 md:pl-0 lg:col-span-4";

  return (
    <section
      ref={ref}
      id={id}
      data-chapter={chapter}
      aria-labelledby={`${id}-h`}
      className={`py-[clamp(88px,14vh,160px)] ${chapter === "paper" ? "chapter-paper" : "bg-bg"}`}
    >
      <div className="container-x">
        <h2 id={`${id}-h`} data-enter className={`${name} text-muted`}>
          {heading}
        </h2>
        <ul className="mt-[0.35em] flex flex-col [&:has(a:hover)_a:not(:hover)_.cap]:text-muted">
          {rows.map((r) => (
            <li key={r.label} data-enter>
              {r.href ? (
                <Link href={r.href} className={row}>
                  <span className={`cap ${name} transition-colors duration-300 md:col-span-7 lg:col-span-8`}>
                    {r.label}
                    <ArrowUpRight
                      aria-hidden="true"
                      className="ml-2 inline h-[0.5em] w-[0.5em] -translate-y-[0.1em] opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100"
                    />
                  </span>
                  <span className={desc}>{r.desc}</span>
                </Link>
              ) : (
                <div className={row}>
                  <span className={`${name} md:col-span-7 lg:col-span-8`}>{r.label}</span>
                  <span className={desc}>{r.desc}</span>
                </div>
              )}
            </li>
          ))}
        </ul>
        {more && (
          <p data-enter className="mt-14 text-[17px]">
            <Link href={more.href} className="font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              {more.label}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
