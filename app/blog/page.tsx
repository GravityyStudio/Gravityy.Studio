import { ArrowUpRight } from "lucide-react";
import WorkGrid from "@/components/work/WorkGrid";
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
      <section data-glow aria-labelledby="posts-h" className="py-[clamp(88px,12vw,160px)]">
        <div className="container-x">
          <h2 id="posts-h" data-reveal className="display !text-[clamp(36px,5vw,80px)]">
            Latest notes
          </h2>
          {posts.length ? (
            <ul className="mt-12 grid gap-5 sm:grid-cols-2 lg:mt-16 lg:grid-cols-3">
              {posts.map((p, i) => (
                <li key={p.slug} data-panel>
                  <Link
                    href={`/blog/${p.slug}`}
                    className="group flex h-full flex-col overflow-hidden rounded-xl bg-surface shadow-hairline transition-[transform,box-shadow] duration-[400ms] ease-brand hover:-translate-y-1.5 hover:shadow-glow-card"
                  >
                    <span className="relative block aspect-[16/10] overflow-hidden bg-raised">
                      {p.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element -- covers are CMS URLs (Supabase Storage or external)
                        <img src={p.cover_url} alt="" loading={i < 3 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition-transform duration-700 ease-brand group-hover:scale-[1.05]" />
                      ) : (
                        <span aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(80%_80%_at_70%_20%,rgb(var(--glow)/0.35),transparent_70%)]" />
                      )}
                    </span>
                    <span className="flex flex-1 flex-col gap-3 p-6 sm:p-7">
                      <span className="text-[14px] text-muted">{postDate(p)}</span>
                      <span className="text-[clamp(22px,2vw,28px)] font-semibold leading-tight tracking-[-0.03em]">{p.title}</span>
                      {p.excerpt && <span className="line-clamp-3 text-fg/80">{p.excerpt}</span>}
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 font-semibold">
                        Read <ArrowUpRight size={16} aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                      </span>
                    </span>
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
      <WorkGrid id="recent" title="Recent work" limit={3} />
    </main>
  );
}
