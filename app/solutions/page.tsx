import PageHero from "@/components/PageHero";
import HomeServices from "@/components/home/HomeServices";
import WorkGrid from "@/components/work/WorkGrid";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("solutions", "/solutions");

export default async function SolutionsPage() {
  const { pages, solutions } = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Solutions", "/solutions"]])} />
      <PageHero crumbs={[["Solutions", "/solutions"]]} title={pages.solutions.title} lede={pages.solutions.lede} />
      <HomeServices
        id="engagements"
        heading="Five engagements"
        items={solutions.map((s) => ({ label: s.name, desc: s.desc }))}
        more={{ href: "/services", label: "The services they are built from" }}
      />
      <WorkGrid title="Selected work" limit={3} />
    </main>
  );
}
