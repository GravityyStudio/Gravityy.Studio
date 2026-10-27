import PageHero from "@/components/PageHero";
import JsonLd from "@/components/JsonLd";
import { breadcrumbLd } from "@/lib/seo";

type Props = { title: string; path: string; lede: string; updated: string; sections: [string, string[]][] };

/** Plain legal page: the page hero, then numbered-free sections of short paragraphs at reading width. */
export default function LegalPage({ title, path, lede, updated, sections }: Props) {
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([[title, path]])} />
      <PageHero title={title} lede={lede} />
      <div className="container-x grid gap-12 pb-[clamp(72px,10vw,140px)] lg:grid-cols-12 lg:gap-x-8">
        <p className="text-[15px] text-muted lg:col-span-3">Last updated {updated}</p>
        <div className="flex max-w-[68ch] flex-col gap-10 lg:col-span-8 lg:col-start-5">
          {sections.map(([h, paras]) => (
            <section key={h} aria-labelledby={`s-${h}`}>
              <h2 id={`s-${h}`} className="text-[clamp(22px,2vw,28px)] font-semibold tracking-[-0.02em]">
                {h}
              </h2>
              {paras.map((p) => (
                <p key={p.slice(0, 32)} className="mt-3 text-fg/85">
                  {p}
                </p>
              ))}
            </section>
          ))}
        </div>
      </div>
    </main>
  );
}
