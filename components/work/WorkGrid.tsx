"use client";
import { useMemo, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import { useContent } from "@/components/ContentProvider";
import type { Case } from "@/lib/casePosters";
import WorkCard from "./WorkCard";

// "D2C skincare · Website + automation" → ["Website", "Automation"]
const kinds = (c: Case) => (c.sector.split("·")[1] ?? "").split("+").map((k) => k.trim().replace(/^\w/, (x) => x.toUpperCase())).filter(Boolean);

type Props = { title: string; id?: string; limit?: number; filters?: boolean; surface?: boolean };

/**
 * Projects as a card grid. With `filters`, chips (aria-pressed) narrow the grid by project type and the cards reflow
 * with Framer layout animation; otherwise the first `limit` projects plus a link to /work.
 */
export default function WorkGrid({ title, id = "work", limit = 0, filters = false, surface = false }: Props) {
  const all = useContent().cases as Case[];
  const reduce = useReducedMotion();
  const [kind, setKind] = useState("All");
  const types = useMemo(() => ["All", ...new Set(all.flatMap(kinds))], [all]);
  const shown = (limit ? all.slice(0, limit) : all).filter((c) => kind === "All" || kinds(c).includes(kind));

  return (
    <section id={id} data-glow aria-labelledby={`${id}-h`} className={`${surface ? "bg-surface/40" : ""} py-[clamp(56px,8vh,96px)]`}>
      <div className="container-x">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 id={`${id}-h`} data-reveal className="display !text-[clamp(36px,5vw,80px)]">
            {title}
          </h2>
          {limit > 0 && (
            <Link href="/work" className="group inline-flex min-h-[44px] items-center gap-2 font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
              All projects
              <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          )}
        </div>

        {filters && (
          <div role="group" aria-label="Filter projects by type" className="mt-10 flex flex-wrap gap-2">
            {types.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={kind === t}
                onClick={() => setKind(t)}
                className={`relative inline-flex min-h-[44px] items-center rounded-pill px-5 text-[15px] font-semibold transition-colors duration-300 ${kind === t ? "text-on-accent" : "text-fg/80 shadow-hairline hover:text-fg"}`}
              >
                {kind === t && <m.span layoutId={`${id}-chip`} aria-hidden="true" className="absolute inset-0 -z-0 rounded-pill bg-accent" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
                <span className="relative">{t}</span>
              </button>
            ))}
          </div>
        )}

        {filters && (
          <p role="status" className="sr-only">
            {`Showing ${shown.length} ${shown.length === 1 ? "project" : "projects"}`}
          </p>
        )}
        <m.ul layout={!reduce} className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
          <AnimatePresence mode="popLayout" initial={false}>
            {shown.map((c, i) => (
              <m.li
                key={c.slug}
                data-case
                layout={!reduce}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="h-full"
              >
                <WorkCard c={c} priority={filters && i < 2} />
              </m.li>
            ))}
          </AnimatePresence>
        </m.ul>
      </div>
    </section>
  );
}
