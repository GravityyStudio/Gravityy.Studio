import { ArrowUpRight } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import PageHero from "@/components/PageHero";
import FinalCTA from "@/components/FinalCTA";
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
      <PageHero crumbs={[["Blog", "/blog"]]} eyebrow={pages.blog.eyebrow} title={pages.blog.title} lede={pages.blog.lede} />
      <section aria-label="Posts" className="section pt-0">
        <div className="container-x">
          {posts.length ? (
            <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
              {posts.map((p, i) => (
                <li key={p.slug} className="rise" style={{ animationDelay: `${Math.min(i, 6) * 60}ms` }}>
                  <Link href={`/blog/${p.slug}`} className="card group flex h-full flex-col overflow-hidden transition-colors hover:border-line-strong">
                    {p.cover_url && (
                      <span className="block aspect-[16/9] overflow-hidden bg-raised">
                        {/* eslint-disable-next-line @next/next/no-img-element -- covers are CMS URLs (Supabase Storage or external) */}
                        <img src={p.cover_url} alt="" loading={i < 3 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                      </span>
                    )}
                    <span className="flex flex-1 flex-col gap-3 p-6">
                      <span className="font-mono text-[11px] uppercase tracking-[0.12em] text-muted">{postDate(p)}</span>
                      <span className="text-xl font-medium leading-snug tracking-[-0.02em]">{p.title}</span>
                      {p.excerpt && <span className="line-clamp-3 text-[15px] leading-relaxed text-muted">{p.excerpt}</span>}
                      <span className="mt-auto inline-flex items-center gap-1 pt-2 text-sm font-medium group-hover:text-accent">
                        Read <ArrowUpRight size={14} aria-hidden="true" />
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="card px-6 py-16 text-center text-muted">The first notes are on their way. Check back soon.</p>
          )}
        </div>
      </section>
      <FinalCTA />
    </main>
  );
}
