// Trust blocks. Only real, confirmed content renders: no placeholder slots on the live site.

const CLIENTS = ["Viara Studios", "ATHLEX"]; // real clients from /work; add approved names as they come

/** Fill this in to show the team block on the home page (photo in /public, with descriptive alt text). */
const FOUNDER: { name: string; role: string; bio: string; photo: string; alt: string } | null = null;

export function LogoStrip() {
  return (
    <section aria-labelledby="clients-h" className="py-[clamp(32px,5vw,64px)]">
      <div className="container-x flex flex-wrap items-baseline gap-x-10 gap-y-4">
        <h2 id="clients-h" className="text-[15px] text-muted">
          Recently shipped for
        </h2>
        <ul className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          {CLIENTS.map((c) => (
            <li key={c} className="text-[clamp(22px,2.4vw,32px)] font-semibold">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TeamBlock() {
  if (!FOUNDER) return null;
  return (
    <section data-glow aria-labelledby="team-h" className="py-[clamp(56px,8vh,96px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-x-8">
        {/* eslint-disable-next-line @next/next/no-img-element -- a single static portrait */}
        <img data-panel src={FOUNDER.photo} alt={FOUNDER.alt} className="aspect-[4/5] w-full max-w-[420px] rounded-xl object-cover lg:col-span-5" />
        <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
          <h2 id="team-h" data-reveal className="display !text-[clamp(36px,5vw,72px)]">
            The people who build it
          </h2>
          <p className="max-w-[52ch] text-fg/85">
            {FOUNDER.name}, {FOUNDER.role}. {FOUNDER.bio}
          </p>
          <p className="max-w-[52ch] text-muted">One team designs, builds and automates, so you deal with the same people from the first call to the last release.</p>
        </div>
      </div>
    </section>
  );
}
