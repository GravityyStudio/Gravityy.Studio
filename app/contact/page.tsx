import FinalCTA from "@/components/FinalCTA";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("contact", "/contact");

export default function ContactPage() {
  return (
    <main id="main" className="pt-16">
      <JsonLd data={breadcrumbLd([["Contact", "/contact"]])} />
      <FinalCTA level="h1" />
    </main>
  );
}
