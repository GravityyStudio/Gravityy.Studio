import PageHero from "@/components/PageHero";
import WorkStrip from "@/components/home/WorkStrip";
import HomePricing from "@/components/home/HomePricing";
import Configurator from "@/components/Configurator";
import HomeFaq from "@/components/home/HomeFaq";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd, offersLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("pricing", "/pricing");

export default async function PricingPage() {
  const { pages, plans } = await getContent();
  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["Pricing", "/pricing"]]), offersLd(plans)]} />
      <PageHero crumbs={[["Pricing", "/pricing"]]} title={pages.pricing.title} lede={pages.pricing.lede} />
      <HomePricing />
      <Configurator />
      <WorkStrip surface={false} />
      <HomeFaq />
    </main>
  );
}
