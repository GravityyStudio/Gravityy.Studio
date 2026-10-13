import type { ReactNode } from "react";
import AppShell from "@/components/app/AppShell";
import PortalNav from "@/components/app/PortalNav";
import { requireUser } from "@/lib/auth";

// Per-user (session cookies + RLS): never prerender or cache.
export const dynamic = "force-dynamic";

export const metadata = { title: { default: "Portal", template: "%s · Portal — Gravityy Studio" }, robots: { index: false, follow: false } };

/** Every client-portal section (the printable invoice page sits outside this group, without the shell). */
export default async function PortalLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireUser("/portal");
  const first = profile.full_name?.split(" ")[0];
  return (
    <AppShell eyebrow="Client portal" title={`Hi${first ? `, ${first}` : ""}.`} email={profile.email} role={profile.role} aside={<PortalNav admin={profile.role === "admin"} />}>
      {children}
    </AppShell>
  );
}
