import PageHero from "@/components/PageHero";
import FAQ from "@/components/FAQ";
import FinalCTA from "@/components/FinalCTA";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd, faqLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("faq", "/faq");

export default async function FaqPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["FAQ", "/faq"]]), faqLd(content)]} />
      <PageHero crumbs={[["FAQ", "/faq"]]} eyebrow={content.pages.faq.eyebrow} title={content.pages.faq.title} lede={content.pages.faq.lede} />
      <FAQ />
      <FinalCTA />
    </main>
  );
}
