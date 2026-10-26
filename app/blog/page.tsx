import { ArrowUpRight } from "lucide-react";
import WorkStrip from "@/components/home/WorkStrip";
import Link from "@/components/ui/SmartLink";
import PageHero from "@/components/PageHero";
import FooterNewsletter from "@/components/FooterNewsletter";
import JsonLd from "@/components/JsonLd";
import { cmsPageMeta, getContent } from "@/lib/content";
import { getPosts, postDate } from "@/lib/posts";
import { breadcrumbLd } from "@/lib/seo";

export const revalidate = 300;
export const generateMetadata = () => cmsPageMeta("blog", "/blog");

export default async function BlogPage() {
  const [{ pages }, posts] = await Promise.all([getContent(), getPosts()]);
  return (
    <main id="main">
      <JsonLd data={breadcrumbLd([["Blog", "/blog"]])} />
      <PageHero crumbs={[["Blog", "/blog"]]} title={pages.blog.title} lede={pages.blog.lede} />
      <section aria-labelledby="posts-h" className="bg-surface py-[clamp(88px,12vw,160px)]">
        <div className="container-x">
          <h2 id="posts-h" className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em]">
            Latest notes
          </h2>
          {posts.length ? (
            <ul className="mt-12 flex flex-col gap-16 lg:mt-16">
              {posts.map((p, i) => (
                <li key={p.slug} className="rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                  <Link href={`/blog/${p.slug}`} className="group grid gap-6 lg:grid-cols-12 lg:items-center lg:gap-x-8">
                    <span className="flex flex-col gap-3 lg:col-span-7">
                      <span className="text-[15px] text-muted">{postDate(p)}</span>
                      <span className="text-[clamp(28px,3vw,40px)] font-medium leading-tight tracking-[-0.03em] underline decoration-transparent underline-offset-[6px] transition-colors group-hover:decoration-accent">
                        {p.title}
                      </span>
                      {p.excerpt && <span className="line-clamp-3 max-w-[60ch] text-[17px] leading-relaxed text-muted">{p.excerpt}</span>}
                      <span className="inline-flex items-center gap-1 text-[17px] font-medium">
                        Read <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </span>
                    {p.cover_url && (
                      <span className="block aspect-[16/10] overflow-hidden bg-raised lg:col-span-5">
                        {/* eslint-disable-next-line @next/next/no-img-element -- covers are CMS URLs (Supabase Storage or external) */}
                        <img src={p.cover_url} alt="" loading={i < 2 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-10 grid gap-10 lg:grid-cols-12 lg:items-start lg:gap-x-8">
              <p className="max-w-[40ch] text-[20px] leading-snug lg:col-span-6">
                The first notes are on their way: what we learn shipping and growing client systems, once a month.
              </p>
              <div className="lg:col-span-5 lg:col-start-8">
                <FooterNewsletter />
              </div>
            </div>
          )}
        </div>
      </section>
      <WorkStrip />
    </main>
  );
}
