import { notFound } from "next/navigation";
import CmsShapePage from "@/components/admin/CmsShapePage";
import AppTabs from "@/components/app/AppTabs";
import { human } from "@/lib/resources";
import { PAGE_KEYS, type PageKey } from "@/lib/page-keys";

export async function generateMetadata({ params }: { params: Promise<{ page: string }> }) {
  return { title: `Pages · ${human((await params).page)}` };
}

const TABS = PAGE_KEYS.map((k) => ({ href: `/admin/cms/${k}`, label: k === "faq" ? "FAQ" : human(k) }));

/** Hero copy + SEO description for each marketing page (the `pages` CMS entry). */
export default async function PageEditor({ params }: { params: Promise<{ page: string }> }) {
  const { page } = await params;
  if (!PAGE_KEYS.includes(page as PageKey)) notFound();
  return (
    <CmsShapePage
      entryKey="pages"
      part={page}
      title="Pages"
      intro={page === "home" ? "Home hero: the three headline lines (the last one is lime), the subline and both buttons." : "Page header copy and the meta description search engines show."}
    >
      <div className="mt-6">
        <AppTabs tabs={TABS} />
      </div>
    </CmsShapePage>
  );
}
