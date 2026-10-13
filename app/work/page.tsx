import PageHero from "@/components/PageHero";
import CaseStack from "@/components/CaseStack";
import Showreel from "@/components/Showreel";
import Testimonials from "@/components/Testimonials";
import FinalCTA from "@/components/FinalCTA";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd, workLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("work", "/work");

export default async function WorkPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["Work", "/work"]]), workLd(content)]} />
      <PageHero
        crumbs={[["Work", "/work"]]}
        eyebrow={content.pages.work.eyebrow} title={content.pages.work.title} lede={content.pages.work.lede} />
      <CaseStack />
      <Showreel />
      <Testimonials />
      <FinalCTA />
    </main>
  );
}
