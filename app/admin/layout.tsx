import type { ReactNode } from "react";
import AppShell from "@/components/app/AppShell";
import AdminNav from "@/components/admin/AdminNav";
import { requireAdmin } from "@/lib/auth";

// Per-user (session cookies + RLS): never prerender or cache.
export const dynamic = "force-dynamic";

export const metadata = { title: { default: "Admin", template: "%s · Admin — Gravityy Studio" }, robots: { index: false, follow: false } };

/** RBAC gate for every /admin route (role from public.profiles); RLS enforces the same rule on every write. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const { profile } = await requireAdmin();
  return (
    <AppShell eyebrow="Admin" title="Studio control room" email={profile.email} role={profile.role} aside={<AdminNav />}>
      {children}
    </AppShell>
  );
}
