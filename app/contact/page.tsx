import PageHero from "@/components/PageHero";
import JsonLd from "@/components/JsonLd";
import Link from "@/components/ui/SmartLink";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("contact", "/contact");

/** Contact: how to reach us. The audit form (#audit) follows directly in the footer. */
export default async function ContactPage() {
  const { pages, site } = await getContent();
  const link = "font-semibold underline decoration-fg/30 underline-offset-4 hover:decoration-accent";
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Contact", "/contact"]])} />
      <PageHero crumbs={[["Contact", "/contact"]]} title={pages.contact.title} lede={pages.contact.lede}>
        <dl className="grid w-full gap-5">
          <div>
            <dt className="text-[15px] text-muted">Email</dt>
            <dd>
              <a href={`mailto:${site.email}`} className={link}>
                {site.email}
              </a>
            </dd>
          </div>
          <div>
            <dt className="text-[15px] text-muted">Existing clients</dt>
            <dd>
              <Link href={site.clientLoginHref} className={link}>
                Client login
              </Link>
            </dd>
          </div>
          <div>
            <dt className="text-[15px] text-muted">Where</dt>
            <dd>Made in India, working worldwide.</dd>
          </div>
        </dl>
      </PageHero>
    </main>
  );
}
