"use client";
import { useRef } from "react";
import Image from "next/image";
import Link from "@/components/ui/SmartLink";
import { SERVICE_PHOTOS, pexelsImage } from "@/lib/pexels";
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
type Props = { id?: string; heading?: string; items?: PosterItem[]; more?: { href: string; label: string } | null };

/** Capabilities as cards: a cursor spotlight, lift and glow on hover; they stagger in on scroll (useEnter / GSAP). */
export default function HomeServices({
  id = "services",
  heading = "What we build",
  items,
  more = { href: "/services", label: "All eleven services, with tools and a live estimate" },
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
  const card =
    "spotlight group relative flex h-full flex-col justify-between gap-5 overflow-hidden sm:min-h-[220px] sm:gap-8 rounded-xl bg-surface p-7 shadow-hairline transition-[transform,box-shadow] duration-[400ms] ease-brand";
  const photoFor = (r: PosterItem) => SERVICE_PHOTOS[r.href?.split("/services/")[1] ?? ""];
  const body = (r: PosterItem) => (
    <>
      {photoFor(r) && (
        <span className="relative -mx-7 -mt-7 mb-1 block aspect-[16/9] overflow-hidden">
          <Image
            src={pexelsImage(photoFor(r))}
            alt={photoFor(r).alt}
            fill
            sizes="(min-width:1024px) 25vw, (min-width:640px) 50vw, 100vw"
            quality={60}
            className="object-cover opacity-80 transition-[transform,opacity] duration-700 ease-brand group-hover:scale-105 group-hover:opacity-100"
          />
        </span>
      )}
      <span className="flex items-start justify-between gap-4">
        <span className="text-[clamp(22px,1.8vw,28px)] font-semibold leading-tight">{r.label}</span>
        {r.href && (
          <span aria-hidden="true" className="grid h-10 w-10 shrink-0 place-items-center rounded-pill shadow-hairline transition-[transform,background-color,color] duration-500 ease-brand group-hover:-rotate-45 group-hover:bg-accent group-hover:text-on-accent">
            →
          </span>
        )}
      </span>
      <span className="text-fg/75">{r.desc}</span>
    </>
  );

  return (
    <section ref={ref} id={id} data-glow aria-labelledby={`${id}-h`} className="py-[clamp(64px,10vh,112px)]">
      <div className="container-x">
        <h2 id={`${id}-h`} data-reveal className="display !text-[clamp(30px,4vw,56px)]">
          {heading}
        </h2>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4">
          {rows.map((r) => (
            <li key={r.label} data-enter>
              {r.href ? (
                <Link href={r.href} className={`${card} hover:-translate-y-1.5 hover:shadow-glow-card`}>
                  {body(r)}
                </Link>
              ) : (
                <div className={card}>{body(r)}</div>
              )}
            </li>
          ))}
        </ul>
        {more && (
          <p data-enter className="mt-12 text-[16px]">
            <Link href={more.href} className="font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              {more.label}
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
