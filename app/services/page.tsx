import PageHero from "@/components/PageHero";
import ServicesRail from "@/components/ServicesRail";
import Configurator from "@/components/Configurator";
import Marquee from "@/components/Marquee";
import FinalCTA from "@/components/FinalCTA";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("services", "/services");

export default async function ServicesPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Services", "/services"]])} />
      <PageHero
        crumbs={[["Services", "/services"]]}
        eyebrow={content.pages.services.eyebrow} title={content.pages.services.title} lede={content.pages.services.lede} />
      <ServicesRail />
      <Marquee />
      <Configurator />
      <FinalCTA />
    </main>
  );
}
