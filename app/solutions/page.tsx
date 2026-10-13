import PageHero from "@/components/PageHero";
import Solutions from "@/components/Solutions";
import Analytics from "@/components/Analytics";
import Funnel from "@/components/Funnel";
import Stats from "@/components/Stats";
import FinalCTA from "@/components/FinalCTA";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("solutions", "/solutions");

export default async function SolutionsPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Solutions", "/solutions"]])} />
      <PageHero
        crumbs={[["Solutions", "/solutions"]]}
        eyebrow={content.pages.solutions.eyebrow} title={content.pages.solutions.title} lede={content.pages.solutions.lede} />
      <Solutions />
      <Analytics />
      <Funnel />
      <Stats />
      <FinalCTA />
    </main>
  );
}
