import PageHero from "@/components/PageHero";
import WorkGrid from "@/components/work/WorkGrid";
import HomeServices from "@/components/home/HomeServices";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("process", "/process");

export default async function ProcessPage() {
  const { pages, process: steps, stack } = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Process", "/process"]])} />
      <PageHero crumbs={[["Process", "/process"]]} title={pages.process.title} lede={pages.process.lede} />
      <HomeServices id="steps" heading="Eight steps, in order" items={steps.map((s) => ({ label: s.name, desc: s.desc }))} more={null} />
      <WorkGrid id="recent" title="Recent work" limit={3} />
      <HomeServices id="stack" heading="Tools we trust" items={stack.map((g) => ({ label: g.group, desc: g.items.join(", ") }))} more={null} />
    </main>
  );
}
