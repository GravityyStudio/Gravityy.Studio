"use client";
import { useRef } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { useContent } from "../ContentProvider";

type Testimonial = { quote: string; name: string; role: string; initials?: string; photo?: string };

/**
 * Testimonial slider: native horizontal scroll with snap points (swipe on touch, arrow buttons on desktop, keyboard
 * scroll when focused). Each card shows the quote, a profile photo (or initials until a photo is added in the CMS)
 * and the name and role. Only confirmed testimonials from the CMS; hidden when there are none.
 */
export default function Testimonials({ title = "In their words", more = true }: { title?: string; more?: boolean }) {
  const items = useContent().testimonials as Testimonial[];
  const track = useRef<HTMLUListElement>(null);
  if (!items.length) return null;
  const go = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: "smooth" });
  const btn = "grid h-11 w-11 place-items-center rounded-pill shadow-hairline transition-colors hover:bg-fg/[0.06]";

  return (
    <section id="voices" data-glow aria-labelledby="voices-h" className="py-[clamp(56px,8vh,96px)]">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="voices-h" data-reveal className="display !text-[clamp(30px,4vw,56px)]">
            {title}
          </h2>
          <div className="flex items-center gap-2">
            {more && (
              <Link href="/testimonials" className="mr-2 inline-flex min-h-[44px] items-center font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
                All testimonials
              </Link>
            )}
            <button type="button" onClick={() => go(-1)} aria-label="Previous testimonial" className={btn}>
              <ArrowLeft size={18} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => go(1)} aria-label="Next testimonial" className={btn}>
              <ArrowRight size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
        <ul
          ref={track}
          tabIndex={0}
          aria-label="Testimonials"
          className="mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2 [scrollbar-width:none] focus-visible:outline-accent [&::-webkit-scrollbar]:hidden"
        >
          {items.map((t) => (
            <li key={t.name + t.role} className="flex w-[88%] shrink-0 snap-start flex-col justify-between gap-8 rounded-xl bg-surface p-7 shadow-hairline sm:w-[70%] lg:w-[calc(50%-8px)]">
              <blockquote className="text-[clamp(18px,1.6vw,22px)] font-medium leading-snug">“{t.quote}”</blockquote>
              <figure className="flex items-center gap-4">
                {t.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- CMS photo URL (Supabase Storage or external)
                  <img src={t.photo} alt="" width={56} height={56} loading="lazy" className="h-14 w-14 rounded-full object-cover" />
                ) : (
                  <span aria-hidden="true" className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-accent text-[16px] font-bold text-on-accent">
                    {t.initials ?? t.name.slice(0, 2)}
                  </span>
                )}
                <figcaption className="flex flex-col text-[15px]">
                  <span className="font-semibold">{t.name}</span>
                  <span className="font-mono text-[13px] text-muted">{t.role}</span>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
