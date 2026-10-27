import PageHero from "@/components/PageHero";
import JsonLd from "@/components/JsonLd";
import Testimonials from "@/components/home/Testimonials";
import WorkGrid from "@/components/work/WorkGrid";
import { breadcrumbLd, pageMeta } from "@/lib/seo";

export const metadata = pageMeta("/testimonials", "Testimonials", "What clients say about working with Gravityy Studio on websites, apps and automation.");

export default function TestimonialsPage() {
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Testimonials", "/testimonials"]])} />
      <PageHero crumbs={[["Testimonials", "/testimonials"]]} title="Testimonials" lede="In our clients' own words: what it was like to work with us, and what changed after launch." />
      <Testimonials title="Client words" more={false} />
      <WorkGrid id="recent" title="The work behind them" limit={3} />
    </main>
  );
}
