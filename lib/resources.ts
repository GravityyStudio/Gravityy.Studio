// Admin record types. One field list drives the drawer form, the table cells and the server-side zod schema.
// No imports → safe in client bundles.

export const STAGES = ["new", "contacted", "qualified", "proposal", "won", "lost"] as const;
const CUR = ["INR", "USD"] as const;

export type Field = {
  name: string;
  label: string;
  type: "text" | "textarea" | "email" | "url" | "number" | "money" | "select" | "date" | "checkbox" | "client" | "plan" | "milestones";
  options?: readonly string[];
  required?: boolean;
  min?: number;
  max?: number;
  hint?: string;
};
export type Resource = { title: string; singular: string; columns: string[]; fields: Field[]; order: [string, boolean] };

const currency: Field = { name: "currency", label: "Currency", type: "select", options: CUR, required: true };
const client = (required = false): Field => ({ name: "client_id", label: "Client", type: "client", required });

export const RESOURCES = {
  leads: {
    title: "Leads",
    singular: "lead",
    order: ["updated_at", false],
    columns: ["name", "company", "stage", "value_minor", "source"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 160 },
      { name: "email", label: "Email", type: "email" },
      { name: "company", label: "Company", type: "text", max: 160 },
      { name: "phone", label: "Phone", type: "text", max: 40 },
      { name: "stage", label: "Stage", type: "select", options: STAGES, required: true },
      { name: "source", label: "Source", type: "select", options: ["website", "contact", "audit", "referral", "other"], required: true },
      { name: "value_minor", label: "Deal value", type: "money" },
      currency,
      { name: "notes", label: "Notes", type: "textarea", max: 5000 },
    ],
  },
  subscriptions: {
    title: "Subscriptions",
    singular: "subscription",
    order: ["updated_at", false],
    columns: ["client_id", "plan_id", "status", "amount_minor", "interval", "current_period_end"],
    fields: [
      client(true),
      { name: "plan_id", label: "Plan", type: "plan" },
      { name: "status", label: "Status", type: "select", options: ["active", "paused", "cancelled"], required: true },
      { name: "amount_minor", label: "Amount (before tax)", type: "money", required: true },
      currency,
      { name: "interval", label: "Billing interval", type: "select", options: ["month", "year"], required: true },
      { name: "provider", label: "Provider", type: "select", options: ["manual", "razorpay", "stripe"], required: true },
      { name: "provider_ref", label: "Provider reference", type: "text", max: 200 },
      { name: "started_at", label: "Started", type: "date", required: true },
      { name: "current_period_end", label: "Renews / ends", type: "date" },
    ],
  },
  projects: {
    title: "Projects",
    singular: "project",
    order: ["updated_at", false],
    columns: ["name", "client_id", "status", "progress", "due_date"],
    fields: [
      { name: "name", label: "Project name", type: "text", required: true, max: 160 },
      client(),
      { name: "status", label: "Status", type: "select", options: ["planning", "in_progress", "review", "delivered", "on_hold"], required: true },
      { name: "progress", label: "Progress %", type: "number", min: 0, max: 100 },
      { name: "due_date", label: "Due date", type: "date" },
      { name: "budget_minor", label: "Budget", type: "money" },
      currency,
      { name: "description", label: "Description", type: "textarea", max: 5000, hint: "Visible to the client in their portal." },
      { name: "milestones", label: "Milestones", type: "milestones", hint: "One per line: [x] Design sign-off | 2026-11-01  (use [ ] when not done; the date is optional)" },
    ],
  },
  tickets: {
    title: "Tickets & requests",
    singular: "ticket",
    order: ["updated_at", false],
    columns: ["subject", "client_id", "kind", "priority", "status"],
    fields: [
      { name: "subject", label: "Subject", type: "text", required: true, max: 160 },
      client(),
      { name: "kind", label: "Type", type: "select", options: ["support", "request"], required: true },
      { name: "priority", label: "Priority", type: "select", options: ["normal", "low", "high", "urgent"], required: true },
      { name: "status", label: "Status", type: "select", options: ["open", "in_progress", "resolved", "closed"], required: true },
      { name: "body", label: "Details", type: "textarea", max: 5000 },
      { name: "response", label: "Our response", type: "textarea", max: 5000, hint: "Shown to the client in their portal." },
    ],
  },
  posts: {
    title: "Blog posts",
    singular: "post",
    order: ["updated_at", false],
    columns: ["title", "slug", "published"],
    fields: [
      { name: "title", label: "Title", type: "text", required: true, max: 200 },
      { name: "slug", label: "Slug", type: "text", required: true, max: 120, hint: "Lowercase words joined by hyphens: /blog/your-slug" },
      { name: "excerpt", label: "Excerpt", type: "textarea", max: 400, hint: "Card text and meta description." },
      { name: "cover_url", label: "Cover image URL", type: "url", hint: "Upload in Media, then paste the copied URL." },
      { name: "body", label: "Body (Markdown)", type: "textarea", max: 60000, hint: "## Heading, **bold**, *italic*, `code`, [link](https://…), - lists, > quotes" },
      { name: "published", label: "Published", type: "checkbox" },
    ],
  },
  addons: {
    title: "Add-ons",
    singular: "add-on",
    order: ["sort", true],
    columns: ["name", "region", "price_minor", "active", "sort"],
    fields: [
      { name: "name", label: "Name", type: "text", required: true, max: 120 },
      { name: "description", label: "Description", type: "textarea", max: 400 },
      { name: "price_minor", label: "Price", type: "money", required: true },
      currency,
      { name: "region", label: "Region", type: "select", options: ["IN", "GLOBAL"], required: true },
      { name: "sort", label: "Sort order", type: "number", min: 0, max: 999 },
      { name: "active", label: "Show on pricing page", type: "checkbox" },
    ],
  },
} satisfies Record<string, Resource>;

export type Kind = keyof typeof RESOURCES;
export const KINDS = Object.keys(RESOURCES) as Kind[];

export type Milestone = { title: string; due: string | null; done: boolean };

/** "[x] Title | 2026-11-01" lines ⇄ milestone objects (admin textarea ⇄ projects.milestones jsonb). */
export const parseMilestones = (text: string): Milestone[] =>
  text
    .split("\n")
    .map((l) => l.match(/^\s*(?:\[([ xX])\]\s*)?(.+?)\s*(?:\|\s*(\d{4}-\d{2}-\d{2}))?\s*$/))
    .filter((m): m is RegExpMatchArray => Boolean(m?.[2]))
    .slice(0, 50)
    .map((m) => ({ title: m[2].slice(0, 160), due: m[3] ?? null, done: m[1]?.toLowerCase() === "x" }));
export const formatMilestones = (list: unknown) =>
  (Array.isArray(list) ? (list as Milestone[]) : []).map((m) => `[${m.done ? "x" : " "}] ${m.title}${m.due ? ` | ${m.due}` : ""}`).join("\n");

/** "in_progress" → "In progress" */
export const human = (s: string) => (s.charAt(0).toUpperCase() + s.slice(1)).replace(/_/g, " ");
