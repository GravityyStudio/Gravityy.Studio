"use client";
import { ArrowDown } from "lucide-react";
import { LOCAL } from "@/lib/content";
import { useContent } from "../ContentProvider";

// "Products that land": the name's idea (gravity) as composition. Two flat fields meet at a seam and the statement
// sits across it. One <h1> carries the text; its ::after repeats it (data-text) in the deep lime ink, clipped to the
// part below the seam, so the second line changes ink where it lands (see .hero-statement in globals.css).

export default function HomeHero() {
  const home = useContent().pages.home as typeof LOCAL.pages.home;
  const statement = home.statement ?? LOCAL.pages.home.statement;
  const sub = home.statementSub ?? LOCAL.pages.home.statementSub;

  return (
    <section id="top" aria-labelledby="hero-h" className="relative isolate h-[112svh] overflow-hidden [--seam:46svh] md:[--seam:50svh]">
      <div data-chapter="dark" className="absolute inset-x-0 top-0 h-[var(--seam)] bg-bg" />
      <div data-chapter="accent" className="chapter-accent absolute inset-x-0 bottom-0 top-[var(--seam)]" />

      <h1
        id="hero-h"
        data-text={statement.join("\n")}
        className="hero-statement absolute inset-x-0 z-10 text-center text-[15vw] font-semibold leading-[0.86] tracking-[-0.05em] text-fg md:text-[clamp(88px,10vw,160px)]"
      >
        {statement.map((l, i) => (
          <span key={i} className="block">
            {l}
          </span>
        ))}
      </h1>

      {/* On the lime field, 56px above the bottom of the first screen. */}
      <div className="chapter-accent absolute inset-x-0 z-10 -translate-y-full !bg-transparent px-6" style={{ top: "calc(100svh - 56px)" }}>
        <div className="home-in flex flex-col items-center gap-5 text-center" style={{ animationDelay: "0.8s" }}>
          <p className="max-w-[28ch] text-xl leading-snug md:max-w-[44ch]">{sub}</p>
          <a
            href="#work"
            className="group inline-flex min-h-[44px] items-center gap-2 text-[17px] font-medium underline decoration-fg/40 underline-offset-4 transition-colors hover:decoration-fg"
          >
            See the work
            <ArrowDown size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-y-0.5" />
          </a>
        </div>
      </div>
    </section>
  );
}
