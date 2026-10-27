import type { ReactNode } from "react";
import Link from "@/components/ui/SmartLink";
import { ArrowLeft } from "lucide-react";
import BgVideo from "./ui/BgVideo";

type Props = { title: string; lede: string; crumbs?: [string, string][]; children?: ReactNode; video?: string };

/**
 * Inner-page header: the page's name at poster scale on the left, the lede (and on nested pages a link back to the
 * parent) on the right, both on the title's last baseline. Breadcrumb structured data is emitted by each page, so no
 * visible trail is needed. Title and lede are static (LCP candidates: any animation on them delays LCP).
 */
export default function PageHero({ title, lede, crumbs = [], children, video }: Props) {
  const parent = crumbs.length > 1 ? crumbs[crumbs.length - 2] : null;
  return (
    <section data-glow aria-labelledby="page-h" className="relative overflow-hidden pb-[clamp(48px,7vw,96px)] pt-[clamp(120px,12vw,168px)]">
      {video && <BgVideo src={video} />}
      <div className="container-x grid gap-10 lg:grid-cols-12 lg:items-end lg:gap-x-8">
        <h1 id="page-h" className="display lg:col-span-8">
          {title}
        </h1>
        <div className="flex flex-col gap-6 lg:col-span-4">
          <p className="max-w-[34rem] text-xl leading-snug">{lede}</p>
          {(parent || children) && (
            <div className="flex flex-wrap items-center gap-4">
              {parent && (
                <Link
                  href={parent[1]}
                  className="group inline-flex min-h-[44px] items-center gap-2 text-[16px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent"
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
