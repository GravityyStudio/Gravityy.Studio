import type { ReactNode } from "react";
import Link from "@/components/ui/SmartLink";
import { ArrowLeft } from "lucide-react";

type Props = { title: string; lede: string; crumbs?: [string, string][]; children?: ReactNode };

/**
 * Inner-page header: the page's name at poster scale on the left, the lede (and on nested pages a link back to the
 * parent) on the right, both on the title's last baseline. Breadcrumb structured data is emitted by each page, so no
 * visible trail is needed. CSS-only entrance.
 */
export default function PageHero({ title, lede, crumbs = [], children }: Props) {
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
  return (
    <section data-glow aria-labelledby="page-h" className="pb-[clamp(72px,10vw,140px)] pt-[clamp(140px,16vw,220px)]">
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <h1 id="page-h" className="display home-rise lg:col-span-8">
          {title}
        </h1>
        <div className="home-rise flex flex-col gap-6 lg:col-span-4" style={{ animationDelay: "0.15s" }}>
          <p className="max-w-[34rem] text-xl leading-snug">{lede}</p>
          {(parent || children) && (
            <div className="flex flex-wrap items-center gap-4">
              {parent && (
                <Link
                  href={parent[1]}
                  className="group inline-flex min-h-[44px] items-center gap-2 text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent"
                >
                  <ArrowLeft size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-x-0.5" />
                  All {parent[0].toLowerCase()}
                </Link>
              )}
              {children}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
