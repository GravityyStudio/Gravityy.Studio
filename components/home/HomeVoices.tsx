"use client";
import { useContent } from "../ContentProvider";

/** Client words as cards: confirmed testimonials from the CMS only. */
export default function HomeVoices() {
  const { testimonials } = useContent();
  if (!testimonials.length) return null;

  return (
    <section id="voices" data-glow aria-labelledby="voices-h" className="py-[clamp(56px,8vh,96px)]">
      <div className="container-x">
        <h2 id="voices-h" data-reveal className="display max-w-[14ch] !text-[clamp(36px,5vw,80px)]">
          In their words
        </h2>
        <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:mt-16">
          {testimonials.map((t) => (
            <li key={t.name + t.role} data-panel className="flex flex-col justify-between gap-8 rounded-xl bg-surface p-7 hairline sm:p-9">
              <blockquote className="text-[clamp(20px,1.8vw,24px)] font-medium leading-snug">{t.quote}</blockquote>
              <p className="flex flex-col text-[15px]">
                <span className="font-semibold">{t.name}</span>
                <span className="text-muted">{t.role}</span>
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
