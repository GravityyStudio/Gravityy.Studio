import PageHero from "@/components/PageHero";
import WorkStrip from "@/components/home/WorkStrip";
import HomeFaq from "@/components/home/HomeFaq";
import HomeCta from "@/components/home/HomeCta";
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
      <HomeCta />
      <WorkStrip />
    </main>
  );
}
