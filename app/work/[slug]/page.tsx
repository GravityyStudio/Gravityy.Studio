import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import PageHero from "@/components/PageHero";
import JsonLd from "@/components/JsonLd";
import Button from "@/components/ui/Button";
import { getContent } from "@/lib/content";
import { posterFor, type Case } from "@/lib/casePosters";
import { ORG, SITE, breadcrumbLd, pageMeta } from "@/lib/seo";

type Params = Promise<{ slug: string }>;

const findCase = async (slug: string) => ((await getContent()).cases as Case[]).find((c) => c.slug === slug);

export async function generateStaticParams() {
  return ((await getContent()).cases as Case[]).map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }) {
  const c = await findCase((await params).slug);
  return c ? pageMeta(`/work/${c.slug}`, `${c.title.split(":")[0]}: case study`, c.summary) : {};
}

/** Case study template: hero, key picture, facts (sector, scope, results), the story, and the next project.
 * Every part renders only from real CMS content; nothing is shown as a placeholder. */
export default async function CaseStudy({ params }: { params: Params }) {
  const { slug } = await params;
  const cases = (await getContent()).cases as Case[];
  const i = cases.findIndex((c) => c.slug === slug);
  if (i < 0) notFound();
  const c = cases[i];
  const next = cases[(i + 1) % cases.length];
  const name = c.title.split(":")[0];
  const live = c.url && !c.url.includes("gravityystudio.com");
  const story = ([
    ["The brief", c.brief],
    ["What we did", c.approach],
    ["The outcome", c.outcome],
  ] as [string, string | undefined][]).filter((x): x is [string, string] => !!x[1]);

  return (
    <main id="main">
      <JsonLd
        data={[
          breadcrumbLd([
            ["Work", "/work"],
            [name, `/work/${c.slug}`],
          ]),
          { "@context": "https://schema.org", "@type": "CreativeWork", name: c.title, about: c.sector, abstract: c.summary, url: `${SITE}/work/${c.slug}`, creator: { "@id": ORG } },
        ]}
      />
      <PageHero
        crumbs={[
          ["Work", "/work"],
          [name, `/work/${c.slug}`],
        ]}
        title={name}
        lede={c.summary}
      />

      <section aria-label="Project picture" className="container-x">
        <div data-panel className="relative aspect-[16/10] overflow-hidden rounded-xl bg-surface shadow-panel">
          <Image src={posterFor(c.slug)} alt={c.alt} fill priority sizes="(min-width:1280px) 1216px, 100vw" className="object-cover object-top" />
        </div>
      </section>

      <section aria-labelledby="facts-h" className="container-x grid gap-10 py-[clamp(48px,7vw,96px)] lg:grid-cols-12 lg:gap-x-8">
        <h2 id="facts-h" className="sr-only">
          Project facts
        </h2>
        <dl className="grid gap-8 sm:grid-cols-2 lg:col-span-12 lg:grid-cols-4">
          <div>
            <dt className="text-[15px] text-muted">Sector</dt>
            <dd className="mt-2 text-[20px] font-semibold">{c.sector}</dd>
          </div>
          {!!c.tags?.length && (
            <div>
              <dt className="text-[15px] text-muted">Scope</dt>
              <dd className="mt-2 flex flex-wrap gap-2">
                {c.tags.map((t) => (
                  <span key={t} className="rounded-pill px-3 py-1 text-[14px] hairline">
                    {t}
                  </span>
                ))}
              </dd>
            </div>
          )}
          {c.metrics?.map((m) => (
            <div key={m.l}>
              <dt className="text-[15px] text-muted">{m.l}</dt>
              <dd className="mt-2 text-[clamp(36px,4vw,56px)] font-bold leading-none tracking-[-0.02em]">{m.v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section aria-label="Case study" className={`container-x flex flex-col gap-14 ${story.length ? "pb-[clamp(48px,7vw,96px)]" : "pb-[clamp(40px,5vw,64px)]"}`}>
        {/* The write-up shows only once the CMS case entry has it (brief / approach / outcome) */}
        {story.map(([h, body]) => (
          <div key={h} className="grid gap-4 lg:grid-cols-12 lg:gap-x-8">
            <h2 data-reveal className="display !text-[clamp(28px,3.4vw,48px)] lg:col-span-4">
              {h}
            </h2>
            <p className="max-w-[60ch] text-[20px] leading-relaxed text-fg/85 lg:col-span-7 lg:col-start-6">{body}</p>
          </div>
        ))}
        <div className="flex flex-wrap gap-3">
          {live && (
            <a href={c.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[48px] items-center gap-2 rounded-pill px-6 font-semibold hairline hover:bg-fg/[0.06]">
              View live site <ArrowUpRight size={16} aria-hidden="true" />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          )}
          <Button href="#audit" variant="accent">
            Get a free audit
          </Button>
        </div>
      </section>

      {next.slug !== c.slug && (
        <section aria-label="Next project" className="container-x">
          <Link href={`/work/${next.slug}`} className="group flex items-center justify-between gap-6 rounded-xl bg-surface p-8 hairline transition-colors hover:bg-raised">
            <span className="flex flex-col gap-2">
              <span className="text-[15px] text-muted">Next project</span>
              <span className="display !text-[clamp(28px,4vw,64px)]">{next.title.split(":")[0]}</span>
            </span>
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-pill hairline transition-transform duration-500 group-hover:-rotate-45">
              →
            </span>
          </Link>
        </section>
      )}
    </main>
  );
}
