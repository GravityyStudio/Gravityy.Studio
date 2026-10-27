/**
 * Decorative UI mock: a dark panel of skeleton lines and two chips, with a lime outline that moves from chip to chip
 * in a loop (CSS only, transform). Static under reduced motion. Hidden from assistive tech: it shows no content.
 */
export default function MockPanel({ className = "" }: { className?: string }) {
  const chip = "grid h-10 w-28 place-items-center rounded-pill bg-raised text-[13px] text-muted";
  return (
    <div aria-hidden="true" className={`rounded-xl bg-surface p-7 shadow-panel ${className}`}>
      <div className="flex items-center gap-2">
        <span className="h-2.5 w-2.5 rounded-full bg-fg/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/15" />
      </div>
      <div className="mt-8 flex flex-col gap-3">
        <span className="h-4 w-3/4 rounded-pill bg-fg/15" />
        <span className="h-3 w-full rounded-pill bg-fg/[0.07]" />
        <span className="h-3 w-5/6 rounded-pill bg-fg/[0.07]" />
        <span className="h-3 w-2/3 rounded-pill bg-fg/[0.07]" />
      </div>
      <div className="relative mt-8 flex gap-3">
        <span className={chip}>Design</span>
        <span className={chip}>Build</span>
        <span className="mock-cycle pointer-events-none absolute left-0 top-0 h-10 w-28 rounded-pill shadow-[inset_0_0_0_1.5px_rgb(var(--accent)),var(--shadow-accent)]" />
      </div>
    </div>
  );
}
