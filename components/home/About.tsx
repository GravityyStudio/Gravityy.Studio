import Link from "@/components/ui/SmartLink";

// Facts already stated across the site (hero, FAQ, footer); nothing here is new or estimated.
const FACTS = [
  ["Based in", "India, working worldwide"],
  ["Who we work with", "Founders and growing teams"],
  ["What we do", "Design, build and automate websites, apps and the systems behind them"],
] as const;

/** About us: who the studio is, in a sentence and three facts. */
export default function About() {
  return (
    <section id="about" data-glow aria-labelledby="about-h" className="py-[clamp(56px,8vh,96px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:gap-x-8">
        <h2 id="about-h" data-reveal className="display !text-[clamp(30px,4vw,56px)] lg:col-span-5">
          About us
        </h2>
        <div className="flex flex-col gap-8 lg:col-span-7">
          <p className="max-w-[56ch] text-[clamp(18px,1.6vw,22px)] leading-relaxed text-fg/90">
            Gravityy Studio is one team that designs, builds and automates. You deal with the same people from the first call to the last release, and
            you own everything we make: the code, the design files and the accounts.
          </p>
          <dl className="grid gap-6 sm:grid-cols-3">
            {FACTS.map(([k, v]) => (
              <div key={k} data-panel>
                <dt className="font-mono text-[13px] text-muted">{k}</dt>
                <dd className="mt-2 text-fg/90">{v}</dd>
              </div>
            ))}
          </dl>
          <Link href="/process" className="w-fit font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
            How we work
          </Link>
        </div>
      </div>
    </section>
  );
}
