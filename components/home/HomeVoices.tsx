"use client";
import { useRef } from "react";
import { useEnter } from "@/hooks/useEnter";
import { useContent } from "../ContentProvider";

/** Client words set like letters: the first given room at statement size, the others as reading text. */
export default function HomeVoices() {
  const { testimonials } = useContent();
  const ref = useRef<HTMLElement>(null);
  useEnter(ref);
  if (!testimonials.length) return null;
  const [first, ...rest] = testimonials;

  const SignOff = ({ t }: { t: (typeof testimonials)[number] }) => (
    <footer className="mt-6 text-[15px]">
      <span className="block font-medium">{t.name}</span>
      <span className="block text-muted">{t.role}</span>
    </footer>
  );

  return (
    <section ref={ref} id="voices" data-chapter="dark" aria-labelledby="voices-h" className="bg-surface py-[clamp(96px,14vh,160px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-x-8">
        <h2 id="voices-h" data-enter className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em] lg:col-span-3">
          In their words
        </h2>
        <div className="flex flex-col gap-14 lg:col-span-7 lg:col-start-5">
          <blockquote data-enter>
            <p className="max-w-[46ch] text-[20px] font-medium leading-snug tracking-[-0.02em] sm:text-[32px]">{first.quote}</p>
            <SignOff t={first} />
          </blockquote>
          {rest.map((t) => (
            <blockquote key={t.name + t.role} data-enter className="max-w-[46ch]">
              <p className="text-[17px] leading-[1.55]">{t.quote}</p>
              <SignOff t={t} />
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}
