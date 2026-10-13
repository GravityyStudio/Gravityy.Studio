import type { Metadata } from "next";
import type { Content } from "./content";

// Canonical origin: explicit env → the Vercel project's production domain (set by Vercel on every build, follows a
// custom domain once added) → the planned domain. Server-only: used by metadata, sitemap, robots and auth/payment redirects.
const vercelProd = process.env.VERCEL_PROJECT_PRODUCTION_URL;
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || (vercelProd ? `https://${vercelProd}` : "https://gravityystudio.com")).replace(/\/$/, "");
export const TITLE = "Gravityy Studio — We design. We build. We automate.";
export const DESC =
  "Gravityy Studio designs, builds and automates digital systems: websites, apps, automation and analytics.";
export const KEYWORDS = [
  "Gravityy Studio",
  "web design agency India",
  "Next.js development",
  "website development",
  "web app development",
  "mobile app development",
  "UI/UX design",
  "marketing automation",
  "CRM integration",
  "SEO services",
  "analytics dashboards",
];

const ORG = `${SITE}/#org`;

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
export function siteLd({ services }: Content) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "ProfessionalService",
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
