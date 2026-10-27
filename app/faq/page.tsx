import PageHero from "@/components/PageHero";
import WorkGrid from "@/components/work/WorkGrid";
import HomeFaq from "@/components/home/HomeFaq";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd, faqLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("faq", "/faq");

export default async function FaqPage() {
  const content = await getContent();
  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["FAQ", "/faq"]]), faqLd(content)]} />
      <PageHero crumbs={[["FAQ", "/faq"]]} title={content.pages.faq.title} lede={content.pages.faq.lede} />
      <HomeFaq heading="Every answer" allLink={false} />
      <WorkGrid id="recent" title="Recent work" limit={3} />
    </main>
  );
}
