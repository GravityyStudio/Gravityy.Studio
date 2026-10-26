import Link from "@/components/ui/SmartLink";
import { getContent } from "@/lib/content";
import AuditForm from "./AuditForm";
import FooterNewsletter from "./FooterNewsletter";
import FooterWordmark from "./FooterWordmark";

const linkCls = "inline-flex min-h-[44px] items-center text-fg/80 transition-colors hover:text-fg";

/** A social link is real only once it points at a profile: a bare domain or a {{PLACEHOLDER}} is shown as a labelled gap. */
const isProfile = (href: string) => {
  if (href.includes("{{")) return false;
  try {
    return new URL(href).pathname.replace(/\/+$/, "") !== "";
  } catch {
    return false;
  }
};

/** Footer: the audit form (the site's one), newsletter, link columns, and the wordmark with its bouncing ball. */
export default async function Footer() {
  const { site } = await getContent();
  return (
    <footer data-glow className="cv relative pt-[clamp(88px,12vw,160px)]">
      <div className="container-x">
        <AuditForm />

        <div className="mt-[clamp(72px,10vw,140px)] grid gap-12 sm:grid-cols-2 lg:grid-cols-12 lg:gap-8">
          <div className="flex flex-col gap-4 sm:col-span-2 lg:col-span-4">
            <p className="max-w-[30ch] text-[20px] leading-snug">Design, engineering and automation for teams that want one partner for the whole system.</p>
            <div className="mt-2 max-w-[380px]">
              <FooterNewsletter />
            </div>
          </div>
          {site.FOOTER.map((c) => (
            <nav key={c.title} aria-label={c.title} className="lg:col-span-2">
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
          {/* Social profiles: Site CMS → Site settings → social. */}
          <nav aria-label="Social" className="lg:col-span-2">
            <h2 className="mb-2 font-semibold">Follow</h2>
            <ul className="flex flex-col">
              {(site.social ?? []).map((s) => (
                <li key={s.label}>
                  {isProfile(s.href) ? (
                    <a href={s.href} target="_blank" rel="noopener noreferrer" className={linkCls}>
                      {s.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  ) : (
                    <span className="inline-flex min-h-[44px] items-center text-muted">
                      {s.label} {`{{${s.label.toUpperCase()}_URL}}`}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <FooterWordmark />
        <p className="flex flex-wrap justify-between gap-x-6 gap-y-1 pb-8 pt-6 text-[15px] text-muted">
          <span>© 2026 Gravityy Studio. All rights reserved.</span>
          <span>Made in India, working worldwide.</span>
        </p>
      </div>
    </footer>
  );
}
