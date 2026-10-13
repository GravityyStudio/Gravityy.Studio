"use client";
import { useRef } from "react";
import Image from "next/image";
import { ArrowDown } from "lucide-react";
import heroPoster from "@/public/media/hero-poster.jpg";
import { gsap, useGSAP } from "@/lib/gsap";
import { MOTION, MOTION_OK } from "@/lib/motion";
import { useUI } from "./Providers";
import Button from "./ui/Button";
import HeroReel from "./HeroReel";
import { useContent } from "./ContentProvider";

export default function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { ready, openContact } = useUI();
  const home = useContent().pages.home; // Site CMS → Pages → Home

  // Intro timeline, after the preloader.
  useGSAP(
    () => {
      if (!ready) return;
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap
          .timeline({ defaults: { ease: MOTION.ease.expo } })
          // Window reveal: the reel opens from a rounded frame to full bleed (pre-state set in CSS, so no flash).
          .fromTo(
            "[data-hero-media]",
            { clipPath: "inset(30% 22% 30% 22% round 32px)", scale: 1.18 },
            { clipPath: "inset(0% 0% 0% 0% round 0px)", scale: 1, duration: 1.6, ease: "expo.inOut" },
            0,
          )
          // y:0 clears the px offset GSAP parses from the CSS pre-state (translateY(110%)).
          .fromTo(".hero-line > span", { y: 0, yPercent: 110 }, { y: 0, yPercent: 0, duration: MOTION.dur.heroLine, stagger: MOTION.stagger.hero }, 0.7)
          .fromTo(".hero-rise", { y: 24 }, { y: 0, duration: 0.7, ease: MOTION.ease.out }, "-=0.45")
          .fromTo(".hero-fade", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1, ease: MOTION.ease.out }, "<0.1");
      });
      return () => mm.revert();
    },
    { scope: ref, dependencies: [ready] },
  );

  // Scroll: the full-bleed reel pulls in to a rounded card and dims as you leave the hero; copy lifts and fades.
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        const st = { trigger: ref.current, start: "top top", end: "bottom top", scrub: true };
        gsap.fromTo(
          "[data-hero-scroll]",
          { clipPath: "inset(0% 0% 0% 0% round 0px)" },
          { clipPath: "inset(6% 4% 14% 4% round 32px)", scale: 0.96, opacity: 0.45, ease: "none", scrollTrigger: st },
        );
        gsap.to("[data-hero-copy]", { yPercent: -12, opacity: 0.2, ease: "none", scrollTrigger: st });
      });
      return () => mm.revert();
    },
    { scope: ref },
  );

  return (
    <section ref={ref} id="top" aria-labelledby="hero-h" className="theme-dark relative isolate flex min-h-[100svh] items-end overflow-hidden bg-bg pb-[clamp(56px,10vh,120px)] pt-32">
      {/* Motion reel (Pexels + Pixabay), crossfading over the poster. */}
      <HeroReel
        poster={<Image src={heroPoster} alt="" fill priority sizes="100vw" className="object-cover" />}
        overlay={
          // Legibility: darken toward the copy (bottom + left) without flattening the footage.
          <>
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-b from-bg/55 via-bg/20 to-bg" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-bg/70 via-bg/25 to-transparent" />
            <div aria-hidden="true" className="glow pointer-events-none absolute -right-[20vw] top-[5%] aspect-square w-[90vw] max-w-[1100px] opacity-60" />
          </>
        }
      />

      <div data-hero-copy className="container-x relative z-10">
        <h1 id="hero-h" className="text-hero">
          {home.heroLines.map((l, i) => (
            <span key={i} className="hero-line block overflow-hidden pb-[0.04em]">
              <span className={`block ${i === home.heroLines.length - 1 ? "text-accent" : ""}`}>{l}</span>
            </span>
          ))}
        </h1>
        <div className="mt-8 flex flex-col gap-8 sm:mt-10 md:flex-row md:items-end md:justify-between">
          {/* hero-rise (transform only, never hidden) keeps this — the LCP element — painted from first paint. */}
          <p className="hero-rise max-w-[460px] text-lg leading-relaxed text-fg/80 sm:text-xl">{home.heroSub}</p>
          <div className="hero-fade flex flex-wrap gap-3">
            <Button onClick={() => openContact()}>{home.ctaPrimary}</Button>
            <Button href="/work" variant="ghost">
              {home.ctaSecondary}
            </Button>
          </div>
        </div>
        <p className="hero-fade mt-14 hidden items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-muted md:flex">
          <ArrowDown size={14} aria-hidden="true" /> Scroll
        </p>
      </div>
    </section>
  );
}
