import Counter from "@/components/ui/Counter";

// Every figure is a commitment already published on the site (services list, FAQ, audit form), not a result claim.
const STATS = [
  { v: "11", l: "Services under one roof" },
  { v: "3", l: "Working days to your free audit report" },
  { v: "4–6", l: "Weeks for a typical marketing website" },
  { v: "30", l: "Days of support included after launch" },
];

/** Stats: four published commitments, counting up as they enter view. */
export default function Stats() {
  return (
    <section aria-labelledby="stats-h" className="py-[clamp(48px,7vh,88px)]">
      <div className="container-x">
        <h2 id="stats-h" className="sr-only">
          Gravityy Studio in numbers
        </h2>
        <dl className="grid grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.l} data-panel className="flex flex-col-reverse justify-end gap-2 border-l border-fg/15 pl-5">
              <dt className="max-w-[22ch] text-[15px] text-muted">{s.l}</dt>
              <dd className="display !text-[clamp(40px,5vw,64px)]">
                <Counter value={s.v} />
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
