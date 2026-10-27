import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { signOut } from "@/app/login/actions";
import Counter from "../ui/Counter";
import AppTabs from "./AppTabs";

type Props = { eyebrow: string; title: string; email: string; role: string; tabs?: { href: string; label: string }[]; aside?: ReactNode; children: ReactNode };

/** Frame for Portal + Admin (server component): header, role badge, sign-out, section tabs or a sidebar. */
export default function AppShell({ eyebrow, title, email, role, tabs, aside, children }: Props) {
  return (
    <main id="main" className="container-x min-h-[100svh] pb-section pt-[clamp(120px,14vw,160px)]">
      <header className="rise flex flex-col gap-6 border-b border-line pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.14em] text-accent">{eyebrow}</p>
          <h1 className="mt-3 text-[clamp(36px,5vw,64px)] font-medium leading-none tracking-[-0.04em]">{title}</h1>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="max-w-[240px] truncate text-muted" title={email}>
            {email}
          </span>
          <span className="rounded-full border border-line px-3 py-1 font-mono text-[11px] uppercase tracking-[0.12em] text-fg/80">{role}</span>
          <form action={signOut}>
            <button type="submit" className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-line px-4 transition-colors hover:border-fg/50">
              <LogOut size={14} aria-hidden="true" /> Sign out
            </button>
          </form>
        </div>
      </header>
      {tabs && (
        <div className="rise mt-6" style={{ animationDelay: "80ms" }}>
          <AppTabs tabs={tabs} />
        </div>
      )}
      {aside ? (
        <div className="mt-6 grid gap-8 lg:mt-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-10">
          <aside className="rise min-w-0" style={{ animationDelay: "80ms" }}>
            {aside}
          </aside>
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        <div className="mt-10">{children}</div>
      )}
    </main>
  );
}

/** Small stat tile used on dashboards: the value counts up as the tile enters view (final text always in the DOM). */
export function StatTile({ label, value, hint, delay = 0 }: { label: string; value: string; hint?: string; delay?: number }) {
  return (
    <div className="card card-lift spotlight rise relative flex flex-col gap-2 overflow-hidden p-6" style={{ animationDelay: `${delay}ms` }}>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="text-[clamp(26px,3vw,36px)] font-medium tracking-[-0.03em]">
        <Counter value={value} />
      </p>
      {hint && <p className="text-[13px] text-fg/70">{hint}</p>}
    </div>
  );
}

export { default as DataTable } from "./DataTable";
