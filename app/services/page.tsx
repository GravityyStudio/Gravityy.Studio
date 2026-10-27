import PageHero from "@/components/PageHero";
import WorkGrid from "@/components/work/WorkGrid";
import HomeServices from "@/components/home/HomeServices";
import Configurator from "@/components/Configurator";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("services", "/services");

export default async function ServicesPage() {
  const { pages, services } = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Services", "/services"]])} />
      <PageHero crumbs={[["Services", "/services"]]} title={pages.services.title} lede={pages.services.lede} />
      <HomeServices heading="Every service" items={services.map((s) => ({ label: s.name, desc: s.desc, href: `/services/${s.id}` }))} more={null} />
      <WorkGrid id="recent" title="Recent work" limit={3} />
      <Configurator />
    </main>
  );
}
