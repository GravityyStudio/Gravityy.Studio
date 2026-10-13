import Link from "@/components/ui/SmartLink";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import QuoteButton from "@/components/QuoteButton";
import JsonLd from "@/components/JsonLd";
import Icon from "@/components/ui/Icon";
import { estimateINR, fmtINR, fmtUSD, toUSD } from "@/lib/pricing";
import { breadcrumbLd, pageMeta, serviceLd } from "@/lib/seo";
import { getContent, type Content } from "@/lib/content";

type Params = { params: Promise<{ slug: string }> };
const find = async (slug: string) => (await getContent()).services.find((s) => s.id === slug);
const m = (list: Content["configurator"]["SCOPES"], id: string) => list.find((o) => o.id === id)!.m;

// ISR: known services prerender at build; services added later in the CMS render on first request.
export const revalidate = 300;
export const dynamicParams = true;
export const generateStaticParams = async () => (await getContent()).services.map((s) => ({ slug: s.id }));

export async function generateMetadata({ params }: Params) {
  const s = await find((await params).slug);
  if (!s) return {};
  return pageMeta(`/services/${s.id}`, s.name, `${s.desc} Built with ${s.tags.join(", ")}. Estimates from ${fmtINR(estimateINR([s.base], 1, 1))}.`);
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const { services, process: steps, configurator: cfg } = await getContent();
  const s = services.find((x) => x.id === slug);
  if (!s) notFound();

  // Same math as the configurator: base × scope × timeline.
  const standard = estimateINR([s.base], m(cfg.SCOPES, "standard"), m(cfg.TIMELINES, "standard"));
  const low = estimateINR([s.base], m(cfg.SCOPES, "lean"), m(cfg.TIMELINES, "flexible"));
  const high = estimateINR([s.base], m(cfg.SCOPES, "advanced"), m(cfg.TIMELINES, "rush"));
  const others = services.filter((o) => o.id !== s.id);
  const prefill = `Hi Gravityy team,\n\nI'm interested in ${s.name} (estimate from ${fmtINR(standard)}, ≈ ${fmtUSD(toUSD(standard))}).\n\nAbout the project:\n`;

  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["Services", "/services"], [s.name, `/services/${s.id}`]]), serviceLd(s, standard)]} />
      <PageHero crumbs={[["Services", "/services"], [s.name, `/services/${s.id}`]]} eyebrow={`Service · ${s.code}`} title={s.name} lede={s.desc} />

      <section aria-label="Overview" className="pb-section">
        <div className="container-x grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <div className="card flex flex-col gap-8 p-7 sm:p-10">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-2xl border border-line">
                <Icon name={s.icon} size={24} />
              </span>
              <h2 className="text-2xl font-medium tracking-[-0.03em]">Tools we use</h2>
            </div>
            <ul className="flex flex-wrap gap-2">
              {s.tags.map((t) => (
                <li key={t} className="rounded-full border border-line px-4 py-2 text-[15px]">
                  {t}
                </li>
              ))}
            </ul>
            <p className="text-[15px] leading-relaxed text-muted">
              Every {s.name.toLowerCase()} engagement follows the same fixed, visible process below, ships with tracking from day one, and
              you own the code, design files and accounts.
            </p>
          </div>

          <aside aria-label="Estimate" className="glass flex flex-col gap-6 rounded-card border border-line p-7 sm:p-10">
            <p className="font-mono text-xs uppercase tracking-[0.14em] text-muted">Starting estimate</p>
            <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <span className="text-[clamp(40px,5vw,60px)] font-medium leading-none tracking-[-0.04em]">{fmtINR(standard)}</span>
              <span className="text-xl text-muted">≈ {fmtUSD(toUSD(standard))}</span>
            </p>
            <p className="text-sm leading-relaxed text-muted">
              Standard scope, standard timeline. Range {fmtINR(low)} (lean, flexible) to {fmtINR(high)} (advanced, rush).
            </p>
            <div className="flex flex-wrap gap-3">
              <QuoteButton prefill={prefill} />
              <Link href="/pricing#configurator" className="inline-flex min-h-[48px] items-center gap-2 px-2 text-[15px] font-medium hover:text-accent">
                Combine services <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <section aria-labelledby="how-h" className="cv py-section">
        <div className="container-x">
          <h2 id="how-h" className="text-h2">How we deliver it</h2>
          <ol className="mt-14 grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
            {steps.map((st, i) => (
              <li key={st.name} className="flex flex-col gap-3 bg-surface-2 p-6">
                <span className="flex items-center justify-between text-fg/80">
                  <Icon name={st.icon} size={18} />
                  <span className="font-mono text-xs text-muted">{String(i + 1).padStart(2, "0")}</span>
                </span>
                <h3 className="text-lg font-medium tracking-[-0.02em]">{st.name}</h3>
                <p className="text-sm leading-relaxed text-muted">{st.desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="more-h" className="cv py-section">
        <div className="container-x">
          <h2 id="more-h" className="text-h2">Other services</h2>
          <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((o) => (
              <li key={o.id}>
                <Link href={`/services/${o.id}`} className="card group flex min-h-[72px] items-center justify-between gap-4 px-6 py-5 transition-colors hover:border-line-strong">
                  <span className="flex items-center gap-3">
                    <Icon name={o.icon} size={18} className="text-fg/70" />
                    <span className="font-medium">{o.name}</span>
                  </span>
                  <ArrowRight size={16} aria-hidden="true" className="text-muted transition-transform duration-300 group-hover:translate-x-1 group-hover:text-fg" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </main>
  );
}
