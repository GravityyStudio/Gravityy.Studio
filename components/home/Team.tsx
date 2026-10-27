import type { ReactNode } from "react";
import Link from "@/components/ui/SmartLink";
import team from "@/data/team.json";

// Real people only: add { name, role, photo, alt } to data/team.json (photo under /public/team/). Never placeholders.
type Member = { name: string; role: string; photo: string; alt: string };
const MEMBERS = team as Member[];

/**
 * Team: tall portraits in a staggered grid (every other column drops on desktop), monochrome until hovered, with name
 * and designation underneath. Home shows the first four and links to /team; the section is hidden while the list is
 * empty. The /team page passes `empty` to explain instead.
 */
export default function Team({ limit = 0, empty }: { limit?: number; empty?: ReactNode }) {
  const list = limit ? MEMBERS.slice(0, limit) : MEMBERS;
  if (!list.length) return empty ?? null;
  return (
    <section data-glow aria-labelledby="team-h" className="py-[clamp(56px,8vh,96px)]">
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id="team-h" data-reveal className="display !text-[clamp(27px,3.5vw,52px)]">
            The people who build it
          </h2>
          {limit > 0 && MEMBERS.length > limit && (
            <Link href="/team" className="inline-flex min-h-[44px] items-center font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              Meet the team
            </Link>
          )}
        </div>
        <ul className="mt-10 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
          {list.map((p, i) => (
            <li key={p.name} data-panel className={`group ${i % 2 ? "lg:translate-y-12" : ""}`}>
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-surface">
                {/* eslint-disable-next-line @next/next/no-img-element -- local portraits of varying sizes */}
                <img src={p.photo} alt={p.alt} loading="lazy" className="h-full w-full object-cover grayscale transition-[filter,transform] duration-700 ease-brand group-hover:scale-[1.04] group-hover:grayscale-0" />
              </div>
              <p className="mt-4 text-[18px] font-semibold">{p.name}</p>
              <p className="text-[15px] text-muted">{p.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
