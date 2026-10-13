"use client";
import { usePathname } from "next/navigation";
import Link from "@/components/ui/SmartLink";

/** Section tabs for Portal/Admin. Scrolls horizontally on phones; active tab = exact match or nested route. */
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
                className={`inline-flex min-h-[40px] items-center rounded-full px-4 text-sm font-medium transition-colors duration-300 ${on ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
              >
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
