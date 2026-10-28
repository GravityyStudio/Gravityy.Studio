import Button from "../ui/Button";
import BgVideo from "../ui/BgVideo";
import { VIDEOS } from "@/lib/pexels";

// Copy lives here rather than in the CMS `pages.home` entry so the live entry stays untouched until launch.
const HEADLINE = ["Websites & apps", "that convert."];
const TAGLINE = "Products that land.";
const SUB = "Gravityy Studio designs, builds and automates websites, apps and the systems behind them, for founders and growing teams in India and worldwide.";

/**
 * Hero on the glow. The headline and paragraph are LCP candidates, so they are static: Chrome only records LCP for an
 * element once any animation on it (even transform-only) has finished, which pushed mobile LCP past 3s. Only the
 * small tagline and the CTAs rise in. One primary CTA, one secondary.
 */
export default function HomeHero() {
  return (
    <section id="top" data-glow aria-labelledby="hero-h" className="relative flex flex-col justify-end overflow-hidden pb-[clamp(48px,9vh,112px)] pt-32 sm:min-h-[70svh] lg:min-h-[100svh] lg:pt-36">
      <BgVideo src={VIDEOS.hero} />
      <div className="container-x">
        <p className="home-rise mb-6 font-mono text-[clamp(15px,1.4vw,18px)] font-medium text-accent">{TAGLINE}</p>
        <h1 id="hero-h" className="display">
          {HEADLINE.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h1>
        <div className="mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:items-end lg:gap-x-8">
          <p className="max-w-[36rem] text-[18px] leading-snug text-fg/85 lg:col-span-6">{SUB}</p>
          <div className="home-rise flex flex-wrap gap-3 lg:col-span-6 lg:justify-end" style={{ animationDelay: "0.2s" }}>
            <Button href="#audit" variant="accent">
              Get a free audit
            </Button>
            <Button href="#work" variant="ghost">
              See the work
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
