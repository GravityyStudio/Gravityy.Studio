import PageHero from "@/components/PageHero";
import HomeWork from "@/components/home/HomeWork";
import HomeReel from "@/components/home/HomeReel";
import HomeVoices from "@/components/home/HomeVoices";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd, workLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("work", "/work");

export default async function WorkPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["Work", "/work"]]), workLd(content)]} />
      <PageHero crumbs={[["Work", "/work"]]} title={content.pages.work.title} lede={content.pages.work.lede} />
      <HomeWork limit={0} />
      <HomeReel />
      <HomeVoices />
    </main>
  );
}
