import type { StaticImageData } from "next/image";
import morsiqo from "@/public/media/work-morsiqo.jpg";
import morsiqoFull from "@/public/media/work-morsiqo-full.jpg";
import reelorbit from "@/public/media/work-reelorbit.jpg";
import reelorbitFull from "@/public/media/work-reelorbit-full.jpg";
import stadiora from "@/public/media/work-stadiora.jpg";
import viara from "@/public/media/work-viara.jpg";
import athlex from "@/public/media/work-athlex.jpg";
import athlexFull from "@/public/media/work-athlex-full.jpg";

/** Screenshot per case slug (cases.json / CMS; `node scripts/capture-work.mjs`): the site's first screen, 4:3. */
const POSTERS: Record<string, StaticImageData> = { morsiqo, reelorbit, stadiora, viara, athlex };
export const posterFor = (slug: string) => POSTERS[slug] ?? morsiqo;

/** Full-page capture (three screens tall) that a card scrolls through on hover; loaded only on hover. */
const FULL: Record<string, StaticImageData> = { morsiqo: morsiqoFull, reelorbit: reelorbitFull, athlex: athlexFull };
export const fullFor = (slug: string): StaticImageData | undefined => FULL[slug];

export type Case = { slug: string; video?: boolean; sector: string; title: string; summary: string; url?: string; alt: string; tags?: string[]; metrics?: { v: string; l: string }[]; brief?: string; approach?: string; outcome?: string };
