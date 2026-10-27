import { getContent } from "@/lib/content";
import { formatMinor, isPlaceholderPrice, type Plan } from "@/lib/billing";
import { SITE } from "@/lib/seo";

// /llms.txt: a plain summary for AI tools, built from the same CMS content and plan rows as the site, so prices and
// services can never drift from what checkout charges. Revalidates with the rest of the CMS content.
export const revalidate = 300;

const price = (plans: Plan[], id: string) => {
  const p = plans.find((x) => x.id === id && x.active);
  if (!p || isPlaceholderPrice(p)) return null;
  const tax = p.gst_rate > 0 ? ` + ${Math.round(p.gst_rate * 100)}% GST` : "";
  return `${formatMinor(p.amount_minor, p.currency)}${p.interval === "month" ? " per month" : " per project"}${tax}`;
};

export async function GET() {
  const { services, plans, cases, site } = await getContent();
  const pick = (id: string) => services.find((s) => s.id === id);
  const lines = [
    "# Gravityy Studio",
    "",
    "> India-based digital studio that designs, builds and automates websites, web and mobile apps, automation and analytics for founders and growing teams. Made in India, working worldwide.",
    "",
    "## Services",
    ...(["web", "app", "auto", "data"] as const).flatMap((id) => {
      const s = pick(id);
      return s ? [`- [${s.name}](${SITE}/services/${s.id}): ${s.desc}`] : [];
    }),
    `- [All services](${SITE}/services)`,
    "",
    "## Pricing",
    `- [Pricing](${SITE}/pricing): Build Websites (one-time) from ${price(plans, "build-in") ?? "see pricing"} in India, ${price(plans, "build-global") ?? "on request"} internationally; Grow (monthly) from ${price(plans, "grow-in") ?? "see pricing"} in India, ${price(plans, "grow-global") ?? "on request"} internationally.`,
    "",
    "## Work",
    ...cases.slice(0, 3).map((c) => `- ${c.title} (${c.sector})`),
    `- [All work](${SITE}/work)`,
    "",
    "## Company",
    `- [Process](${SITE}/process)`,
    `- [Solutions](${SITE}/solutions)`,
    `- [FAQ](${SITE}/faq)`,
    `- [Contact](${SITE}/contact): ${site.email}. Free audit: send a website URL and work email for a written report within 3 working days.`,
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}
