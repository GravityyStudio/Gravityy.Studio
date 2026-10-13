import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "@/components/ui/SmartLink";
import JsonLd from "@/components/JsonLd";
import Markdown from "@/components/Markdown";
import FinalCTA from "@/components/FinalCTA";
import { getPost, getPosts, postDate } from "@/lib/posts";
import { SITE, breadcrumbLd, pageMeta } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

// ISR: published posts prerender; new ones render on first request and are cached under the `cms` tag.
export const revalidate = 300;
export const dynamicParams = true;
export const generateStaticParams = async () => (await getPosts()).map((p) => ({ slug: p.slug }));

export async function generateMetadata({ params }: Params) {
  const p = await getPost((await params).slug);
  if (!p) return {};
  const meta = pageMeta(`/blog/${p.slug}`, p.title, p.excerpt ?? p.title);
  return { ...meta, openGraph: { ...meta.openGraph, type: "article", ...(p.cover_url ? { images: [p.cover_url] } : {}) } };
}

export default async function PostPage({ params }: Params) {
  const p = await getPost((await params).slug);
  if (!p) notFound();
  const ld = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: p.title,
    description: p.excerpt ?? undefined,
    image: p.cover_url ?? undefined,
    datePublished: p.published_at ?? p.updated_at,
    dateModified: p.updated_at,
    url: `${SITE}/blog/${p.slug}`,
    author: { "@type": "Organization", name: "Gravityy Studio" },
  };

  return (
    <main id="main">
      <JsonLd data={[breadcrumbLd([["Blog", "/blog"], [p.title, `/blog/${p.slug}`]]), ld]} />
      <article className="container-x max-w-[760px] pb-section pt-[clamp(140px,16vw,200px)]">
        <Link href="/blog" className="inline-flex min-h-[44px] items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-muted hover:text-fg">
          <ArrowLeft size={14} aria-hidden="true" /> Blog
        </Link>
        <p className="mt-8 font-mono text-xs uppercase tracking-[0.14em] text-accent">{postDate(p)}</p>
        <h1 className="mt-4 text-[clamp(36px,6vw,64px)] font-medium leading-[1.02] tracking-[-0.04em]">{p.title}</h1>
        {p.excerpt && <p className="mt-6 text-xl leading-relaxed text-muted">{p.excerpt}</p>}
        {p.cover_url && (
          // eslint-disable-next-line @next/next/no-img-element -- CMS URL (Supabase Storage or external)
          <img src={p.cover_url} alt="" className="mt-10 aspect-[16/9] w-full rounded-card border border-line object-cover" />
        )}
        <div className="mt-12">
          <Markdown source={p.body} />
        </div>
      </article>
      <FinalCTA />
    </main>
  );
}
