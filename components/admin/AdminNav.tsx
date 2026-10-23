"use client";
import {
  Braces, Briefcase, Columns3, ExternalLink, FileText, FolderKanban, Image, LayoutDashboard, LifeBuoy, Menu, Palette, PenLine, Puzzle,
  Quote, Radar, Receipt, Repeat, ScrollText, Settings, Tag, Type, Users,
} from "lucide-react";
import SideNav, { type NavGroup } from "@/components/app/SideNav";
import { PAGE_KEYS } from "@/lib/page-keys";

const NAV: NavGroup[] = [
  {
    group: "Sales and operations",
    items: [
      ["Overview", "/admin", LayoutDashboard],
      ["Leads", "/admin/leads", Columns3],
      ["Discovery", "/admin/discovery", Radar],
      ["Clients", "/admin/clients", Users],
      ["Subscriptions", "/admin/subscriptions", Repeat],
      ["Projects", "/admin/projects", FolderKanban],
      ["Tickets & requests", "/admin/tickets", LifeBuoy],
      ["Invoices", "/admin/invoices", Receipt],
    ],
  },
  {
    group: "Site CMS",
    items: [
      ["Pages", "/admin/cms/home", FileText],
      ["Media", "/admin/cms/media", Image],
      ["Theme", "/admin/cms/theme", Palette],
      ["Typography", "/admin/cms/typography", Type],
      ["Menu", "/admin/cms/navigation", Menu],
      ["Site settings", "/admin/cms/settings", Settings],
      ["Raw JSON", "/admin/cms/json", Braces],
    ],
  },
  {
    group: "Content",
    items: [
      ["Case studies", "/admin/content/case_studies", Briefcase],
      ["Blog", "/admin/content/posts", PenLine],
      ["Testimonials", "/admin/content/testimonials", Quote],
      ["Plans", "/admin/content/plans", Tag],
      ["Add-ons", "/admin/content/addons", Puzzle],
    ],
  },
  {
    group: "System",
    items: [
      ["Audit log", "/admin/audit-log", ScrollText],
      ["Client portal", "/portal", ExternalLink],
    ],
  },
];

/** Admin sidebar. "Pages" stays active on every page editor (/admin/cms/<page>). */
export default function AdminNav() {
  return <SideNav label="Admin" nav={NAV} also={{ "/admin/cms/home": PAGE_KEYS.map((k) => `/admin/cms/${k}`) }} />;
}
