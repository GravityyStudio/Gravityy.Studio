import PageHero from "@/components/PageHero";
import ProcessPinned from "@/components/ProcessPinned";
import TechStack3D from "@/components/TechStack3D";
import FinalCTA from "@/components/FinalCTA";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("process", "/process");

export default async function ProcessPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Process", "/process"]])} />
      <PageHero
        crumbs={[["Process", "/process"]]}
        eyebrow={content.pages.process.eyebrow} title={content.pages.process.title} lede={content.pages.process.lede} />
      <ProcessPinned />
      <TechStack3D />
      <FinalCTA />
    </main>
  );
}
