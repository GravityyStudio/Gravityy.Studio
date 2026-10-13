import { getContent } from "@/lib/content";
import CountUp from "./ui/CountUp";

export default async function Stats() {
  const { site } = await getContent();
  return (
    <section aria-label="Studio stats" className="section cv [contain-intrinsic-size:auto_400px]">
      <dl className="container-x grid gap-12 sm:grid-cols-3">
        {site.stats.map((s) => (
          <div key={s.label} className="flex flex-col-reverse gap-3 border-l border-line pl-6">
            <dt className="text-base text-muted">{s.label}</dt>
            <dd className="text-stat font-medium">
              <CountUp value={s.value} decimals={s.decimals} suffix={s.suffix} />
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
