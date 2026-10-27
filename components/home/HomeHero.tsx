import Button from "../ui/Button";

// Copy lives here rather than in the CMS `pages.home` entry so the live entry stays untouched until launch.
const HEADLINE = ["Websites & apps", "that convert."];
const TAGLINE = "Products that land.";
const SUB = "Gravityy Studio designs, builds and automates websites, apps and the systems behind them, for founders and growing teams in India and worldwide.";

/**
 * Hero on the glow. The headline is the LCP element, so it is in the HTML and painted on the first frame; the CSS
 * entrance only lifts it (transform, no fade or blur), so it counts as painted at once. One primary CTA, one secondary.
 */
export default function HomeHero() {
  return (
    <section id="top" data-glow aria-labelledby="hero-h" className="relative flex min-h-[100svh] flex-col justify-end pb-[clamp(56px,9vh,112px)] pt-36">
      <div className="container-x">
        <p className="home-rise mb-6 text-[clamp(20px,2vw,28px)] font-medium tracking-[-0.02em] text-accent">{TAGLINE}</p>
        <h1 id="hero-h" className="display home-rise">
          {HEADLINE.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </h1>
        <div className="home-rise mt-10 grid gap-8 lg:mt-14 lg:grid-cols-12 lg:items-end lg:gap-x-8" style={{ animationDelay: "0.2s" }}>
          <p className="max-w-[36rem] text-[20px] leading-snug text-fg/85 lg:col-span-6">{SUB}</p>
          <div className="flex flex-wrap gap-3 lg:col-span-6 lg:justify-end">
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
