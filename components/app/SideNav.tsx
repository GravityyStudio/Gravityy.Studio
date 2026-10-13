"use client";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import AppTabs from "./AppTabs";

export type NavGroup = { group: string; items: [label: string, href: string, icon: LucideIcon][] };

/**
 * Grouped sidebar (lg+), flattened scrolling tabs on smaller screens. The first item is the section root (exact match);
 * others are active on nested routes too. `also` adds extra paths that light up an item.
 */
export default function SideNav({ label, nav, also = {} }: { label: string; nav: NavGroup[]; also?: Record<string, string[]> }) {
  const path = usePathname();
  const root = nav[0]?.items[0]?.[1];
  const on = (href: string) => path === href || (href !== root && path.startsWith(href + "/")) || Boolean(also[href]?.includes(path));
  const flat = nav.flatMap((g) => g.items.map(([l, href]) => ({ label: l, href })));

  return (
    <>
      <div className="lg:hidden">
        <AppTabs tabs={flat} />
      </div>
      <nav aria-label={label} className="sticky top-28 hidden lg:block">
        {nav.map((g) => (
          <div key={g.group} className="mb-6">
            <p className="mb-2 px-3 font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{g.group}</p>
            <ul className="flex flex-col gap-0.5">
              {g.items.map(([l, href, Icon]) => (
                <li key={href}>
                  <Link
                    href={href}
                    aria-current={on(href) ? "page" : undefined}
                    className={`flex min-h-[40px] items-center gap-3 rounded-xl px-3 text-sm transition-colors duration-200 ${on(href) ? "bg-fg font-medium text-bg" : "text-muted hover:bg-raised hover:text-fg"}`}
                  >
                    <Icon size={16} aria-hidden="true" className="shrink-0" />
                    {l}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </>
  );
}
