import type { Metadata } from "next";
import type { Content } from "./content";
import { isPlaceholderPrice, type Plan } from "./billing";

// Canonical origin: explicit env → the Vercel project's production domain (set by Vercel on every build, follows a
// custom domain once added) → the planned domain. Server-only: used by metadata, sitemap, robots and auth/payment redirects.
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || (vercelProd ? `https://${vercelProd}` : "https://gravityystudio.com")).replace(/\/$/, "");
export const TITLE = "Gravityy Studio — Websites & apps that convert";
export const DESC =
  "Gravityy Studio is an India-based digital studio that designs, builds and automates websites, web and mobile apps, automation and analytics for growing teams worldwide.";
export const ORG = `${SITE}/#org`;

/** Per-page metadata: canonical, OG and Twitter all follow the page. Title uses the root template. */
export function pageMeta(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", url: path, siteName: "Gravityy Studio", title: `${title} — Gravityy Studio`, description, locale: "en_IN" },
    twitter: { card: "summary_large_image", title: `${title} — Gravityy Studio`, description },
  };
}

/** Site-wide graph (root layout): organisation + website + offer catalogue. */
export function siteLd({ services, site }: Content) {
  // Only real profiles (a path after the domain), never a bare domain or a {{PLACEHOLDER}}.
  const sameAs = (site.social ?? []).map((x) => x.href).filter((h) => /^https?:\/\/[^/]+\/.+/.test(h) && !h.includes("{{"));
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": ORG,
        name: "Gravityy Studio",
        url: SITE,
        logo: `${SITE}/brand/gravityy-mark-white.png`,
        image: `${SITE}/opengraph-image`,
        email: "hello@gravityystudio.com",
        description: DESC,
        areaServed: "Worldwide",
        address: { "@type": "PostalAddress", addressCountry: "IN" },
        priceRange: "₹₹",
        ...(sameAs.length ? { sameAs } : {}),
        hasOfferCatalog: {
          "@type": "OfferCatalog",
          name: "Services",
          itemListElement: services.map((s) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: s.name, description: s.desc, url: `${SITE}/services/${s.id}` } })),
        },
      },
      { "@type": "WebSite", "@id": `${SITE}/#website`, url: SITE, name: "Gravityy Studio", publisher: { "@id": ORG }, inLanguage: "en" },
    ],
  };
}

export const breadcrumbLd = (items: [string, string][]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [["Home", "/"] as [string, string], ...items].map(([name, path], i) => ({ "@type": "ListItem", position: i + 1, name, item: `${SITE}${path}` })),
});

/** FAQPage only on /faq, where every Q&A is visible (Google's requirement). */
export const faqLd = ({ faq }: Content) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faq.map((q) => ({ "@type": "Question", name: q.q, acceptedAnswer: { "@type": "Answer", text: q.a } })),
});

export const workLd = ({ cases }: Content) => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: "Selected work",
  itemListElement: cases
    .filter((c) => !c.url.includes("gravityystudio.com"))
    .map((c, i) => ({ "@type": "ListItem", position: i + 1, item: { "@type": "CreativeWork", name: c.title, url: c.url, creator: { "@id": ORG } } })),
});

export const serviceLd = (s: Content["services"][number], fromINR: number) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: s.name,
  description: s.desc,
  url: `${SITE}/services/${s.id}`,
  provider: { "@id": ORG },
  areaServed: "Worldwide",
  offers: { "@type": "Offer", priceCurrency: "INR", price: fromINR, description: "Starting estimate (standard scope and timeline)" },
});

/** Pricing page: one Offer per active plan, priced from the same rows checkout charges (GST noted for INR). */
export const offersLd = (plans: Plan[]) => ({
  "@context": "https://schema.org",
  "@type": "OfferCatalog",
  name: "Gravityy Studio plans",
  url: `${SITE}/pricing`,
  itemListElement: plans
    .filter((p) => p.active && !isPlaceholderPrice(p))
    .map((p) => ({
      "@type": "Offer",
      name: `${p.name} (${p.region === "IN" ? "India" : "International"})`,
      price: (p.amount_minor / 100).toFixed(2),
      priceCurrency: p.currency,
      url: `${SITE}/pricing`,
      seller: { "@id": ORG },
      ...(p.interval === "month" ? { priceSpecification: { "@type": "UnitPriceSpecification", price: (p.amount_minor / 100).toFixed(2), priceCurrency: p.currency, unitCode: "MON" } } : {}),
      ...(p.gst_rate > 0 ? { description: `Plus ${Math.round(p.gst_rate * 100)}% GST at checkout` } : {}),
    })),
});
