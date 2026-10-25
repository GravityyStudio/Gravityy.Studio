import PageHero from "@/components/PageHero";
import WorkStrip from "@/components/home/WorkStrip";
import HomeServices from "@/components/home/HomeServices";
import HomeCta from "@/components/home/HomeCta";
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
      <HomeServices id="steps" heading="Eight steps, in order" chapter="dark" items={steps.map((s) => ({ label: s.name, desc: s.desc }))} more={null} />
      <WorkStrip />
      <HomeServices id="stack" heading="Tools we trust" items={stack.map((g) => ({ label: g.group, desc: g.items.join(", ") }))} more={null} />
      <HomeCta />
    </main>
  );
}
