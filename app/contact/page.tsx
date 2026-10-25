import HomeCta from "@/components/home/HomeCta";
import WorkStrip from "@/components/home/WorkStrip";
import JsonLd from "@/components/JsonLd";
import Link from "@/components/ui/SmartLink";
import { cmsPageMeta, getContent } from "@/lib/content";
import { breadcrumbLd } from "@/lib/seo";

export const generateMetadata = () => cmsPageMeta("contact", "/contact");

export default async function ContactPage() {
  const { site } = await getContent();
  const link = "font-medium underline decoration-fg/30 underline-offset-4 hover:decoration-accent";
  return (
    <main id="main" className="pt-16">
      <JsonLd data={breadcrumbLd([["Contact", "/contact"]])} />
      <HomeCta
        level="h1"
        title="Tell us what you're building."
        aside={
          <dl className="grid gap-5 text-[17px]">
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
              <dd>India, working with clients worldwide</dd>
            </div>
          </dl>
        }
      />
      <WorkStrip />
    </main>
  );
}
