import type { StaticImageData } from "next/image";
import morsiqo from "@/public/media/work-morsiqo.jpg";
import reelorbit from "@/public/media/work-reelorbit.jpg";
import stadiora from "@/public/media/work-stadiora.jpg";
import viara from "@/public/media/work-viara.jpg";
import athlex from "@/public/media/work-athlex.jpg";

/** Screenshot per case slug (cases.json / CMS; `node scripts/capture-work.mjs`); unknown slugs fall back to the first. */
const POSTERS: Record<string, StaticImageData> = { morsiqo, reelorbit, stadiora, viara, athlex };
export const posterFor = (slug: string) => POSTERS[slug] ?? morsiqo;

export type Case = { slug: string; video?: boolean; sector: string; title: string; summary: string; url?: string; alt: string; tags?: string[]; metrics?: { v: string; l: string }[]; brief?: string; approach?: string; outcome?: string };
