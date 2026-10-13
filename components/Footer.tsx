import Link from "@/components/ui/SmartLink";
import { getContent } from "@/lib/content";
import BrandMark from "./ui/BrandMark";
import { socialIcon } from "./ui/BrandIcons";
import FooterNewsletter from "./FooterNewsletter";

export default async function Footer() {
  const { site } = await getContent();
  return (
    <footer className="cv border-t border-line bg-sunken pb-10 pt-16">
      <div className="container-x grid gap-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Link href="/" className="flex w-fit items-center gap-2.5 text-lg font-semibold tracking-[-0.03em]">
            <BrandMark height={24} />
            Gravityy Studio
          </Link>
          <p className="max-w-[280px] text-sm leading-relaxed text-muted">Design, engineering and automation for teams that want one partner for the whole system.</p>
          <div className="mt-4">
            <FooterNewsletter />
          </div>
        </div>
        {site.FOOTER.map((c) => (
          <nav key={c.title} aria-label={c.title}>
            <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.12em] text-muted">{c.title}</h2>
            <ul className="flex flex-col">
              {c.links.map((l) => {
                const cls = "inline-flex min-h-[40px] items-center text-[15px] text-fg/85 transition-colors hover:text-fg";
                if (l.href.startsWith("/"))
                  return (
                    <li key={l.label}>
                      <Link href={l.href} className={cls}>
                        {l.label}
                      </Link>
                    </li>
                  );
                const ext = l.href.startsWith("http");
                return (
                  <li key={l.label}>
                    <a href={l.href} className={cls} {...(ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                      {l.label}
                      {ext && <span className="sr-only"> (opens in a new tab)</span>}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>
      <div className="container-x mt-16 flex flex-col-reverse gap-6 border-t border-line pt-6 text-[13px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="flex flex-wrap gap-x-4 gap-y-1">
          <span>© 2026 Gravityy Studio. All rights reserved.</span>
          <span className="font-mono">Made in India · Working worldwide</span>
        </p>
        {/* Social profiles: Site CMS → Site settings → social. Icons stay put; hover is a colour + border change only. */}
        <ul aria-label="Social" className="flex gap-2">
          {(site.social ?? []).map((s) => {
            const Icon = socialIcon(s.label);
            return (
              <li key={s.href}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.label} (opens in a new tab)`}
                  title={s.label}
                  className="grid h-10 w-10 place-items-center rounded-full border border-line text-fg/70 transition-colors duration-200 hover:border-fg/50 hover:bg-fg/[0.06] hover:text-fg"
                >
                  <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
                </a>
              </li>
            );
          })}
        </ul>
      </div>
    </footer>
  );
}
