import PageHero from "@/components/PageHero";
import HomeServices from "@/components/home/HomeServices";
import HomeWork from "@/components/home/HomeWork";
import HomeCta from "@/components/home/HomeCta";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent, LOCAL } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("solutions", "/solutions");

// What each engagement is and what it is built from. The CMS entry may predate `desc`; fall back to the local copy by name.
const describe = (s: { name: string; desc?: string }) => s.desc ?? LOCAL.solutions.find((x) => x.name === s.name)?.desc ?? "";

export default async function SolutionsPage() {
  const { pages, solutions } = await getContent();
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Solutions", "/solutions"]])} />
      <PageHero crumbs={[["Solutions", "/solutions"]]} title={pages.solutions.title} lede={pages.solutions.lede} />
      <HomeServices
        id="engagements"
        heading="Five engagements"
        chapter="dark"
        items={(solutions as { name: string; desc?: string }[]).map((s) => ({ label: s.name, desc: describe(s) }))}
        more={{ href: "/services", label: "The services they are built from" }}
      />
      <HomeWork />
      <HomeCta />
    </main>
  );
}
