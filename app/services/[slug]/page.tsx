import Link from "@/components/ui/SmartLink";
import WorkGrid from "@/components/work/WorkGrid";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import Image from "next/image";
import PageHero from "@/components/PageHero";
import { SERVICE_PHOTOS, pexelsImage } from "@/lib/pexels";
import QuoteButton from "@/components/QuoteButton";
import HomeProcess from "@/components/home/HomeProcess";
import HomeServices from "@/components/home/HomeServices";
import JsonLd from "@/components/JsonLd";
import { fmtINR, fmtUSD, toUSD, type Scope } from "@/lib/pricing";
import { breadcrumbLd, pageMeta, serviceLd } from "@/lib/seo";
import { getContent } from "@/lib/content";
import serviceCopy from "@/data/service-copy.json";

type Params = { params: Promise<{ slug: string }> };
// Long-form page copy, imported here only so it isn't sent to every page with the CMS content.
const COPY: Record<string, (typeof serviceCopy)["web"] | undefined> = serviceCopy;
const find = async (slug: string) => (await getContent()).services.find((s) => s.id === slug);

// ISR: known services prerender at build; services added later in the CMS render on first request.
export const revalidate = 300;
export const dynamicParams = true;
export const generateStaticParams = async () => (await getContent()).services.map((s) => ({ slug: s.id }));

export async function generateMetadata({ params }: Params) {
  const s = await find((await params).slug);
  if (!s) return {};
  const c = COPY[s.id];
  return pageMeta(`/services/${s.id}`, c?.seoTitle ?? s.name, c?.metaDescription ?? s.desc);
}

export default async function ServicePage({ params }: Params) {
  const { slug } = await params;
  const { services, configurator: cfg, usdRate } = await getContent();
  const s = services.find((x) => x.id === slug);
  if (!s) notFound();

  const standard = s.prices.standard;
  const copy = COPY[s.id];
  const others = services.filter((o) => o.id !== s.id);
  const prefill = `Hi Gravityy team,\n\nI'm interested in ${s.name} (estimate from ${fmtINR(standard)}, ≈ ${fmtUSD(toUSD(standard, usdRate))}).\n\nAbout the project:\n`;

  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["Services", "/services"], [s.name, `/services/${s.id}`]]), serviceLd(s, s.prices.lean)]} />
      <PageHero crumbs={[["Services", "/services"], [s.name, `/services/${s.id}`]]} title={s.name} lede={s.desc} />
      {SERVICE_PHOTOS[s.id] && (
        <div className="container-x pb-[clamp(48px,7vw,96px)]">
          <div data-panel className="relative aspect-[21/9] overflow-hidden rounded-xl bg-surface">
            <Image src={pexelsImage(SERVICE_PHOTOS[s.id])} alt={SERVICE_PHOTOS[s.id].alt} fill priority sizes="(min-width:1280px) 1216px, 100vw" quality={65} className="object-cover" />
          </div>
        </div>
      )}

      {copy && (
        <section aria-labelledby="about-h" className="container-x grid gap-10 pb-[clamp(48px,7vw,96px)] lg:grid-cols-12 lg:gap-x-8">
          <div className="flex flex-col gap-5 lg:col-span-7">
            <h2 id="about-h" className="text-[clamp(24px,2.5vw,34px)] font-medium leading-tight">
              How we approach it
            </h2>
            {copy.intro.map((p) => (
              <p key={p} className="max-w-[62ch] text-[17px] leading-relaxed text-fg/85">
                {p}
              </p>
            ))}
          </div>
          <div className="flex flex-col gap-3 lg:col-span-4 lg:col-start-9">
            <h3 className="text-[18px] font-semibold">Who it&apos;s for</h3>
            <p className="text-[16px] leading-relaxed text-muted">{copy.audience}</p>
          </div>
        </section>
      )}

      <section aria-labelledby="tools-h" className="bg-surface py-[clamp(64px,8vw,112px)]">
        <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-x-8">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <h2 id="tools-h" className="text-[clamp(24px,2.5vw,34px)] font-medium leading-tight">
              Built with
            </h2>
            <ul className="flex flex-col gap-1 text-[clamp(24px,2.5vw,34px)] font-medium leading-tight text-muted">
              {s.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="max-w-[48ch] text-[16px] leading-relaxed">
              Every {s.name.toLowerCase()} engagement follows the same fixed, visible process, ships with tracking from day one, and you own the code, design files
              and accounts.
            </p>
          </div>

          <aside aria-label="Estimate" className="flex flex-col gap-5 lg:col-span-5 lg:col-start-8">
            <p className="text-[15px] text-muted">Standard scope, standard timeline</p>
            <p className="text-[clamp(42px,4.9vw,73px)] font-semibold leading-[1.05] tracking-[-0.02em] tabular-nums">{fmtINR(standard)}</p>
            <p className="text-[18px] text-muted">≈ {fmtUSD(toUSD(standard, usdRate))}</p>
            <dl className="divide-y divide-fg/10 text-[16px]">
              {cfg.SCOPES.map((o) => (
                <div key={o.id} className="flex items-baseline justify-between gap-4 py-2.5">
                  <dt>{o.label}</dt>
                  <dd className="tabular-nums">
                    {fmtINR(s.prices[o.id as Scope])} <span className="text-muted">≈ {fmtUSD(toUSD(s.prices[o.id as Scope], usdRate))}</span>
                  </dd>
                </div>
              ))}
            </dl>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <QuoteButton prefill={prefill} label="Talk to us first" />
              <Link href="/pricing#configurator" className="group inline-flex min-h-[48px] items-center gap-2 px-2 text-[16px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
                Combine services <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      {copy && (
        <section aria-labelledby="scope-h" className="container-x flex flex-col gap-[clamp(48px,6vw,80px)] py-[clamp(64px,8vw,112px)]">
          <div>
            <h2 id="scope-h" className="text-[clamp(24px,2.5vw,34px)] font-medium leading-tight">
              What each scope includes
            </h2>
            <ul className="mt-8 grid gap-4 md:grid-cols-3">
              {cfg.SCOPES.map((o) => (
                <li key={o.id} className="rounded-xl bg-surface p-6 shadow-hairline">
                  <p className="font-semibold">{o.label}</p>
                  <p className="mt-1 text-[14px] tabular-nums text-muted">{fmtINR(s.prices[o.id as Scope])}</p>
                  <p className="mt-4 text-[16px] leading-relaxed">{copy.scopes[o.id as Scope]}</p>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="text-[clamp(24px,2.5vw,34px)] font-medium leading-tight">Common questions</h2>
            <dl className="mt-6 grid gap-8 md:grid-cols-2">
              {copy.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-semibold">{f.q}</dt>
                  <dd className="mt-2 text-[16px] leading-relaxed text-muted">{f.a}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      <HomeProcess />
      <WorkGrid id="recent" title="Recent work" limit={3} />
      <HomeServices
        id="more"
        heading="Other services"
        items={others.map((o) => ({ label: o.name, desc: o.desc, href: `/services/${o.id}` }))}
        more={{ href: "/services", label: "All services and the live estimate" }}
      />
    </main>
  );
}
