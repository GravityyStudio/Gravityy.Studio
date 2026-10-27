import type { StaticImageData } from "next/image";
import p1 from "@/public/media/case-1-poster.jpg";
import p2 from "@/public/media/case-2-poster.jpg";
import p3 from "@/public/media/case-3-poster.jpg";
import p4 from "@/public/media/case-4-poster.jpg";
import viara from "@/public/media/work-viara.jpg";
import athlex from "@/public/media/work-athlex.jpg";

/** Poster image per case slug (cases.json / CMS); unknown slugs fall back to the first poster. */
const POSTERS: Record<string, StaticImageData> = { viara, athlex, "case-1": p1, "case-2": p2, "case-3": p3, "case-4": p4 };
export const posterFor = (slug: string) => POSTERS[slug] ?? p1;

export type Case = { slug: string; video?: boolean; sector: string; title: string; summary: string; url?: string; alt: string; tags?: string[]; metrics?: { v: string; l: string }[]; brief?: string; approach?: string; outcome?: string };
