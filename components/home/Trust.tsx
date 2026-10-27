// Trust blocks. Real names are shown as text wordmarks; anything not supplied yet is a visible, labelled placeholder
// ({{LIKE_THIS}}) so it can't be mistaken for a real client, person or number. Search for "{{" before launch.

const CLIENTS = ["Viara Studios", "ATHLEX"]; // real clients from /work
const LOGO_SLOTS = 4; // {{CLIENT_LOGO}} slots to fill with approved logos

export function LogoStrip() {
  return (
    <section aria-labelledby="clients-h" className="py-[clamp(48px,7vw,88px)]">
      <div className="container-x flex flex-col gap-6 lg:flex-row lg:items-center lg:gap-12">
        <h2 id="clients-h" className="shrink-0 text-[15px] text-muted">
          Teams we have shipped for
        </h2>
        <ul className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {CLIENTS.map((c) => (
            <li key={c} className="grid min-h-[64px] place-items-center rounded-md px-4 text-center text-[17px] font-semibold tracking-[-0.02em] hairline">
              {c}
            </li>
          ))}
          {Array.from({ length: LOGO_SLOTS }, (_, i) => (
            <li key={i} className="grid min-h-[64px] place-items-center rounded-md border border-dashed border-fg/20 px-4 text-center text-[13px] text-muted">
              {"{{CLIENT_LOGO}}"}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export function TeamBlock() {
  return (
    <section data-glow aria-labelledby="team-h" className="py-[clamp(80px,11vh,140px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-center lg:gap-x-8">
        <div data-panel className="grid aspect-[4/5] max-w-[420px] place-items-center rounded-xl border border-dashed border-fg/20 p-6 text-center text-[15px] text-muted lg:col-span-5">
          {"{{FOUNDER_PHOTO}}"}
          <br />
          Portrait, 4:5, with descriptive alt text
        </div>
        <div className="flex flex-col gap-6 lg:col-span-6 lg:col-start-7">
          <h2 id="team-h" data-reveal className="display !text-[clamp(36px,5vw,72px)]">
            The people who build it
          </h2>
          <p className="max-w-[52ch] text-fg/85">
            {"{{FOUNDER_NAME}}"}, {"{{FOUNDER_ROLE}}"}. {"{{FOUNDER_BIO: two or three sentences on background, what the studio believes and who it works with.}}"}
          </p>
          <p className="max-w-[52ch] text-muted">One team designs, builds and automates, so you deal with the same people from the first call to the last release.</p>
        </div>
      </div>
    </section>
  );
}
