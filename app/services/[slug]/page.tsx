import Link from "@/components/ui/SmartLink";
import WorkStrip from "@/components/home/WorkStrip";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";
import PageHero from "@/components/PageHero";
import QuoteButton from "@/components/QuoteButton";
import HomeProcess from "@/components/home/HomeProcess";
import HomeServices from "@/components/home/HomeServices";
import JsonLd from "@/components/JsonLd";
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
  const { services, configurator: cfg } = await getContent();
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
      <PageHero crumbs={[["Services", "/services"], [s.name, `/services/${s.id}`]]} title={s.name} lede={s.desc} />

      <section aria-labelledby="tools-h" className="bg-surface py-[clamp(88px,12vw,160px)]">
        <div className="container-x grid gap-14 lg:grid-cols-12 lg:gap-x-8">
          <div className="flex flex-col gap-6 lg:col-span-6">
            <h2 id="tools-h" className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em]">
              Built with
            </h2>
            <ul className="flex flex-col gap-1 text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em] text-muted">
              {s.tags.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
            <p className="max-w-[48ch] text-[17px] leading-relaxed">
              Every {s.name.toLowerCase()} engagement follows the same fixed, visible process, ships with tracking from day one, and you own the code, design files
              and accounts.
            </p>
          </div>

          <aside aria-label="Estimate" className="flex flex-col gap-5 lg:col-span-5 lg:col-start-8">
            <p className="text-[15px] text-muted">Starting estimate, standard scope and timeline</p>
            <p className="text-[clamp(56px,7vw,112px)] font-semibold leading-[0.9] tracking-[-0.055em] tabular-nums">{fmtINR(standard)}</p>
            <p className="text-[20px] text-muted">≈ {fmtUSD(toUSD(standard))}</p>
            <p className="max-w-[44ch] text-[17px] leading-relaxed">
              From {fmtINR(low)} for a lean scope on a flexible timeline, up to {fmtINR(high)} for an advanced scope on a rush timeline.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <QuoteButton prefill={prefill} label="Talk to us first" />
              <Link href="/pricing#configurator" className="group inline-flex min-h-[48px] items-center gap-2 px-2 text-[17px] font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent">
                Combine services <ArrowRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:translate-x-0.5" />
              </Link>
            </div>
          </aside>
        </div>
      </section>

      <HomeProcess />
      <WorkStrip />
      <HomeServices
        id="more"
        heading="Other services"
        items={others.map((o) => ({ label: o.name, desc: o.desc, href: `/services/${o.id}` }))}
        more={{ href: "/services", label: "All services and the live estimate" }}
      />
    </main>
  );
}
