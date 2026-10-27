"use client";
import { usePathname } from "next/navigation";
import { m } from "framer-motion";
import Link from "@/components/ui/SmartLink";

/** Section tabs for Portal/Admin. Scrolls horizontally on phones; active tab = exact match or nested route. The active
 * pill slides between tabs (Framer shared layout). */
export default function AppTabs({ tabs }: { tabs: { href: string; label: string }[] }) {
  const path = usePathname();
  const active = (href: string) => path === href || (href !== tabs[0]?.href && path.startsWith(href + "/"));
  return (
    <nav aria-label="Sections" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <ul className="flex w-max gap-1 rounded-full border border-line p-1">
        {tabs.map((t) => {
          const on = active(t.href);
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                aria-current={on ? "page" : undefined}
                className={`relative inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-medium transition-colors duration-300 ${on ? "text-bg" : "text-muted hover:text-fg"}`}
              >
                {on && <m.span layoutId="app-tab-active" aria-hidden="true" className="absolute inset-0 rounded-full bg-fg" transition={{ type: "spring", stiffness: 420, damping: 36 }} />}
                <span className="relative">{t.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
