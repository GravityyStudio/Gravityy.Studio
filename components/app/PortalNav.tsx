"use client";
import { BarChart3, FolderKanban, LayoutDashboard, LifeBuoy, Puzzle, Receipt, Send, Settings, Shield, Wallet } from "lucide-react";
import SideNav, { type NavGroup } from "./SideNav";

const NAV: NavGroup[] = [
  {
    group: "Workspace",
    items: [
      ["Overview", "/portal", LayoutDashboard],
      ["Projects", "/portal/projects", FolderKanban],
      ["Service requests", "/portal/requests", Send],
      ["Support tickets", "/portal/tickets", LifeBuoy],
      ["Reports", "/portal/reports", BarChart3],
    ],
  },
  {
    group: "Account",
    items: [
      ["Plan & billing", "/portal/billing", Wallet],
      ["Add-ons", "/portal/addons", Puzzle],
      ["Invoices", "/portal/invoices", Receipt],
      ["Settings", "/portal/settings", Settings],
    ],
  },
];

const ADMIN: NavGroup = { group: "Studio", items: [["Admin panel →", "/admin", Shield]] };

/** Client portal sidebar. The admin link is only rendered for admin accounts (the /admin layout enforces it anyway). */
export default function PortalNav({ admin }: { admin: boolean }) {
  return <SideNav label="Portal" nav={admin ? [...NAV, ADMIN] : NAV} />;
}
