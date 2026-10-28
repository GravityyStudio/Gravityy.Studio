// Clients we have shipped for: real, named clients only (from /work). Add approved names here as they come.
const CLIENTS = ["Viara Studios", "ATHLEX"];

/** "Trusted by": a quiet strip of client names under the hero. */
export default function TrustedBy() {
  return (
    <section aria-labelledby="trusted-h" className="py-[clamp(32px,5vw,56px)]">
      <div className="container-x flex flex-wrap items-baseline gap-x-10 gap-y-4">
        <h2 id="trusted-h" className="font-mono text-[13px] text-muted">
          Trusted by
        </h2>
        <ul className="flex flex-wrap items-baseline gap-x-10 gap-y-3">
          {CLIENTS.map((c) => (
            <li key={c} className="text-[clamp(20px,2.2vw,28px)] font-semibold text-fg/90">
              {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
