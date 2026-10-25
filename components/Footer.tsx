import Link from "@/components/ui/SmartLink";
import { getContent } from "@/lib/content";
import FooterNewsletter from "./FooterNewsletter";

const linkCls = "inline-flex min-h-[40px] items-center text-[17px] transition-colors hover:underline hover:underline-offset-4";

/** Inverted close: plain columns above, the name set edge to edge below. */
export default async function Footer() {
  const { site } = await getContent();
  return (
    <footer data-chapter="paper" className="chapter-paper cv pt-[clamp(64px,8vw,112px)]">
      <div className="container-x grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
        <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
          <p className="max-w-[30ch] text-[20px] leading-snug">Design, engineering and automation for teams that want one partner for the whole system.</p>
          <div className="mt-2 max-w-[380px]">
            <FooterNewsletter />
          </div>
        </div>
        {site.FOOTER.map((c) => (
          <nav key={c.title} aria-label={c.title} className="lg:col-span-2">
            <h2 className="mb-2 text-[17px] font-medium">{c.title}</h2>
            <ul className="flex flex-col text-muted">
              {c.links.map((l) => {
                if (l.href.startsWith("/"))
                  return (
                    <li key={l.label}>
                      <Link href={l.href} className={linkCls}>
                        {l.label}
                      </Link>
                    </li>
                  );
                const ext = l.href.startsWith("http");
                return (
                  <li key={l.label}>
                    <a href={l.href} className={linkCls} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {l.label}
                      {ext && <span className="sr-only"> (opens in a new tab)</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
        {/* Social profiles: Site CMS → Site settings → social. */}
        <nav aria-label="Social" className="lg:col-span-2">
          <h2 className="mb-2 text-[17px] font-medium">Follow</h2>
          <ul className="flex flex-col text-muted">
            {(site.social ?? []).map((s) => (
              <li key={s.href}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                  {s.label}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      <div className="container-x mt-[clamp(64px,10vw,160px)]">
        <svg viewBox="0 0 1000 132" className="block w-full" role="img" aria-label="Gravityy Studio">
          <text x="0" y="112" textLength="1000" lengthAdjust="spacingAndGlyphs" fill="currentColor" style={{ fontFamily: "var(--font-geist)", fontSize: 140, fontWeight: 600, letterSpacing: "-0.05em" }}>
            Gravityy Studio
          </text>
        </svg>
        <p className="flex flex-wrap justify-between gap-x-6 gap-y-1 pb-6 pt-5 text-[13px] text-muted">
          <span>© 2026 Gravityy Studio. All rights reserved.</span>
          <span>Made in India, working worldwide</span>
        </p>
      </div>
    </footer>
  );
}
