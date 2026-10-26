"use client";
import { useEffect, useRef, useState } from "react";
import Link from "@/components/ui/SmartLink";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { X } from "lucide-react";
import { useContent } from "./ContentProvider";
import { useUI } from "./Providers";
import Button from "./ui/Button";
import BrandMark from "./ui/BrandMark";
import { useFocusTrap } from "@/hooks/useFocusTrap";

/** "/services/web" is inside "Services"; "/" only matches exactly. */
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
const EASE = [0.22, 1, 0.36, 1] as const;
const morph = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)]";

/**
 * Morphing navigation. At the top of the page a full-width bar (logo, links, client login, CTA); once scrolled it
 * hands over to a compact floating pill. The two swap by transform + opacity, and the inactive one is `inert`, so
 * keyboard and screen-reader users only ever meet one. Phones get the pill only, whose Menu opens a full-screen
 * overlay with a staggered reveal (focus trapped, Esc closes, aria-expanded on the toggle).
 */
export default function Navbar() {
  const { site } = useContent();
  const { lockScroll } = useUI();
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  const links = site.NAV.filter((l) => l.href !== "/").slice(0, 5);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => lockScroll(open), [open, lockScroll]);
  useFocusTrap(panel, open, close);

  const linkCls = (href: string) =>
    `inline-flex min-h-[44px] items-center rounded-pill px-3 text-[15px] transition-colors duration-200 hover:text-fg ${isActive(path, href) ? "text-fg" : "text-muted"}`;
  const cta = (
    <Button href="#audit" variant="accent" className="!min-h-[44px] !px-5 text-[15px]">
      Get a free audit
    </Button>
  );
  const menuButton = (
    <button
      type="button"
      onClick={() => setOpen(true)}
      aria-expanded={open}
      aria-controls="site-menu"
      className="inline-flex min-h-[44px] items-center rounded-pill px-4 text-[15px] font-medium hairline transition-colors hover:bg-fg/[0.06]"
    >
      Menu
    </button>
  );

  return (
    <>
      <header className="nav-intro fixed inset-x-0 top-0 z-50">
        {/* Full bar: desktop, top of page */}
        <nav
          aria-label="Primary"
          inert={!desktop || scrolled}
          className={`container-x hidden h-[76px] items-center justify-between gap-6 lg:flex ${morph} ${scrolled ? "pointer-events-none -translate-y-6 opacity-0" : ""}`}
        >
          <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-[-0.03em]" aria-label="Gravityy Studio, home">
            <BrandMark height={24} priority />
            <span aria-hidden="true">Gravityy Studio</span>
          </Link>
          <ul className="flex items-center gap-1">
            {links.map((l) => (
              <li key={l.href}>
                <Link href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined} className={linkCls(l.href)}>
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <Link href={site.clientLoginHref} className={linkCls(site.clientLoginHref)}>
              Client login
            </Link>
            {cta}
          </div>
        </nav>

        {/* Floating pill: always on phones, after scrolling on desktop */}
        <nav
          aria-label="Primary"
          inert={desktop && !scrolled}
          className={`absolute inset-x-0 top-3 flex justify-center px-3 ${morph} ${scrolled ? "" : "lg:pointer-events-none lg:scale-95 lg:opacity-0"}`}
        >
          <div className="flex w-full max-w-[980px] items-center justify-between gap-2 rounded-pill bg-surface/90 py-1.5 pl-4 pr-1.5 hairline backdrop-blur-md">
            <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-2 text-[16px] font-semibold tracking-[-0.03em]" aria-label="Gravityy Studio, home">
              <BrandMark height={22} />
              <span aria-hidden="true" className="hidden sm:inline">
                Gravityy Studio
              </span>
            </Link>
            <ul className="hidden items-center lg:flex">
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} aria-current={isActive(path, l.href) ? "page" : undefined} className={linkCls(l.href)}>
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-1.5">
              <Link href={site.clientLoginHref} className={`${linkCls(site.clientLoginHref)} hidden xl:inline-flex`}>
                Client login
              </Link>
              {cta}
              <span className="lg:hidden">{menuButton}</span>
            </div>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <m.div
            key="menu"
            id="site-menu"
            ref={panel}
            role="dialog"
            aria-modal="true"
            aria-label="Menu"
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-bg px-5 pb-8 pt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="flex items-center justify-between">
              <Link href="/" onClick={close} className="flex min-h-[44px] items-center gap-2 text-[16px] font-semibold tracking-[-0.03em]" aria-label="Gravityy Studio, home">
                <BrandMark height={22} />
              </Link>
              <button type="button" onClick={close} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-pill hairline">
                <X size={18} aria-hidden="true" />
              </button>
            </div>
            <m.ul className="mt-10 flex flex-col" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}>
              {site.NAV.map((l) => (
                <m.li key={l.href} className="overflow-hidden" variants={{ hide: { y: "100%", opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}>
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={isActive(path, l.href) ? "page" : undefined}
                    className={`display flex min-h-[56px] items-center !text-[clamp(40px,11vw,72px)] ${isActive(path, l.href) ? "text-accent" : "text-fg"}`}
                  >
                    {l.label}
                  </Link>
                </m.li>
              ))}
            </m.ul>
            <m.div className="mt-auto flex flex-col gap-3 pt-10" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.5, ease: EASE } }}>
              <Button href="#audit" variant="accent" onClick={close}>
                Get a free audit
              </Button>
              <Button href={site.clientLoginHref} variant="ghost">
                Client login
              </Button>
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
