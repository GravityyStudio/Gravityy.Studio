// Trust blocks. Only real, confirmed content renders: no placeholder slots on the live site.

const CLIENTS = ["Viara Studios", "ATHLEX"]; // real clients from /work; add approved names as they come

export function LogoStrip() {
  return (
    <section aria-labelledby="clients-h" className="py-[clamp(32px,5vw,64px)]">
      <div className="container-x flex flex-wrap items-baseline gap-x-10 gap-y-4">
        <h2 id="clients-h" className="text-[15px] text-muted">
          Recently shipped for
        </h2>
        <ul className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          {CLIENTS.map((c) => (
            <li key={c} className="text-[clamp(19px,2vw,27px)] font-semibold">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
