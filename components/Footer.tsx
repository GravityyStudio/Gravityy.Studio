import Link from "@/components/ui/SmartLink";
import { getContent } from "@/lib/content";
import AuditForm from "./AuditForm";
import FooterNewsletter from "./FooterNewsletter";
import FooterWordmark from "./FooterWordmark";
import SocialIcons from "./SocialIcons";

const linkCls = "inline-flex min-h-[44px] items-center text-fg/80 transition-colors hover:text-fg";

/** Footer: the audit form (the site's one), newsletter, link columns, and the wordmark with its bouncing ball. */
export default async function Footer() {
  const { site } = await getContent();
  return (
    <footer data-glow className="cv relative pt-[clamp(64px,8vw,112px)]">
      <div className="container-x">
        <AuditForm />

        <div className="mt-[clamp(56px,7vw,96px)] grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
            <p className="max-w-[30ch] text-[18px] leading-snug">Design, engineering and automation for teams that want one partner for the whole system.</p>
            <div className="mt-2 max-w-[380px]">
              <FooterNewsletter />
            </div>
            {/* Social profiles (Site CMS → Site settings → social): real profile URLs only, plus email */}
            <SocialIcons social={site.social ?? []} email={site.email} className="mt-2" />
          </div>
          {site.FOOTER.map((c) => (
            <nav key={c.title} aria-label={c.title} className="lg:col-span-2 lg:last:col-span-4">
              <h2 className="mb-2 font-semibold">{c.title}</h2>
              <ul className="flex flex-col">
                {c.links.map((l) => (
                  <li key={l.label}>
                    {l.href.startsWith("/") ? (
                      <Link href={l.href} className={linkCls}>
                        {l.label}
                      </Link>
                    ) : (
                      <a href={l.href} className={linkCls}>
                        {l.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <FooterWordmark />
        <p className="flex flex-wrap justify-between gap-x-6 gap-y-1 pb-24 pt-6 text-[15px] text-muted">
          <span className="flex flex-wrap items-center gap-x-5">
            <span>© 2026 Gravityy Studio. All rights reserved.</span>
            <Link href="/privacy" className="inline-flex min-h-[44px] items-center hover:text-fg">
              Privacy
            </Link>
            <Link href="/terms" className="inline-flex min-h-[44px] items-center hover:text-fg">
              Terms
            </Link>
          </span>
          <span className="flex flex-wrap items-center gap-x-5">
            <span>
              Stock photos and video:{" "}
              <a href="https://www.pexels.com" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-[44px] items-center underline decoration-fg/30 underline-offset-4 hover:text-fg">
                Pexels
              </a>
            </span>
            <span>Made in India, working worldwide.</span>
          </span>
        </p>
      </div>
    </footer>
  );
}
