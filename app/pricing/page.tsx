import PageHero from "@/components/PageHero";
import Pricing from "@/components/Pricing";
import Configurator from "@/components/Configurator";
import FAQ from "@/components/FAQ";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("pricing", "/pricing");

export default async function PricingPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Pricing", "/pricing"]])} />
      <PageHero
        crumbs={[["Pricing", "/pricing"]]}
        eyebrow={content.pages.pricing.eyebrow} title={content.pages.pricing.title} lede={content.pages.pricing.lede} />
      <Pricing />
      <Configurator />
      <FAQ more={{ href: "/faq", label: "All questions" }} />
    </main>
  );
}
