import type { MetadataRoute } from "next";
import { getContent } from "@/lib/content";
import { getPosts } from "@/lib/posts";
import { SITE } from "@/lib/seo";

const PAGES: [string, number][] = [
  ["", 1],
  ["/services", 0.9],
  ["/work", 0.9],
  ["/solutions", 0.8],
  ["/process", 0.7],
  ["/pricing", 0.9],
  ["/faq", 0.6],
  ["/contact", 0.8],
  ["/blog", 0.7],
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [{ services }, posts] = await Promise.all([getContent(), getPosts()]);
  const lastModified = new Date();
  return [
    ...PAGES.map(([path, priority]) => ({ url: `${SITE}${path}`, lastModified, changeFrequency: "monthly" as const, priority })),
    ...services.map((s) => ({ url: `${SITE}/services/${s.id}`, lastModified, changeFrequency: "monthly" as const, priority: 0.7 })),
    ...posts.map((p) => ({ url: `${SITE}/blog/${p.slug}`, lastModified: new Date(p.updated_at), changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
