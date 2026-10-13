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
import ThemeToggle from "./ThemeToggle";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { FM } from "@/lib/motion";

/** "/services/web" is inside "Services"; "/" only matches exactly. */
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));

export default function Navbar() {
  const { site } = useContent();
  const { openContact, lockScroll } = useUI();
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);

  // Hide on scroll down, reveal on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > 120);
      last = y;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close the menu and show the bar on every route change.
  useEffect(() => {
    setOpen(false);
    setHidden(false);
  }, [path]);

  useEffect(() => lockScroll(open), [open, lockScroll]);
  useFocusTrap(panel, open, close);

  return (
    <>
      <header className={`nav-intro fixed inset-x-0 top-0 z-50 transition-transform duration-500 ${hidden && !open ? "-translate-y-full" : ""}`}>
        <nav aria-label="Primary" className="glass container-x mt-3 flex h-16 items-center justify-between gap-4 rounded-full border border-line !px-3 sm:!px-4 lg:max-w-[1248px]">
          <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-2.5 pl-2 text-[17px] font-semibold tracking-[-0.03em]" aria-label="Gravityy Studio, home">
            <BrandMark height={24} priority />
            <span aria-hidden="true">Gravityy Studio</span>
          </Link>
          <ul className="hidden lg:flex">
            {site.NAV.map((l) => {
              const on = isActive(path, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    className={`relative rounded-full px-3 py-2.5 text-sm transition-colors xl:px-3.5 ${on ? "text-fg" : "text-muted hover:text-fg"}`}
                  >
                    {l.label}
                    {on && <span aria-hidden="true" className="absolute inset-x-3 -bottom-0.5 h-px bg-accent xl:inset-x-3.5" />}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button href={site.clientLoginHref} variant="ghost" className="!hidden !min-h-[44px] !px-4 text-sm xl:!inline-flex">
              Client Login
            </Button>
            <Button onClick={() => openContact()} className="!hidden !min-h-[44px] !px-5 text-sm lg:!inline-flex">
              Start a Project
            </Button>
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="mobile-menu"
              aria-label="Open menu"
              className="grid h-11 w-11 place-items-center rounded-full border border-line lg:hidden"
            >
              <span aria-hidden="true" className="flex flex-col gap-[5px]">
                <span className="h-px w-[18px] bg-fg" />
                <span className="h-px w-[18px] bg-fg" />
                <span className="ml-auto h-px w-3 bg-fg" />
              </span>
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <>
            <m.div key="scrim" className="fixed inset-0 z-[60] bg-black/60 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={close} aria-hidden="true" />
            <m.div
              key="panel"
              id="mobile-menu"
              ref={panel}
              role="dialog"
              aria-modal="true"
              aria-label="Menu"
              className="fixed inset-y-0 right-0 z-[70] flex w-[min(360px,88vw)] flex-col gap-8 overflow-y-auto border-l border-line bg-surface-2 p-6 lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={FM.panel}
            >
              <div className="flex justify-between">
                <ThemeToggle />
                <button type="button" onClick={close} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full border border-line">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <m.ul className="flex flex-col" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}>
                {site.NAV.map((l) => {
                  const on = isActive(path, l.href);
                  return (
                    <m.li key={l.href} variants={{ hide: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0 } }}>
                      <Link
                        href={l.href}
                        onClick={close}
                        aria-current={on ? "page" : undefined}
                        className={`flex items-center justify-between border-b border-line py-4 text-2xl font-medium tracking-[-0.03em] ${on ? "text-fg" : "text-fg/80"}`}
                      >
                        {l.label}
                        {on && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />}
                      </Link>
                    </m.li>
                  );
                })}
              </m.ul>
              <div className="mt-auto flex flex-col gap-3">
                <Button onClick={() => (close(), openContact())}>Start a Project</Button>
                <Button href={site.clientLoginHref} variant="ghost">
                  Client Login
                </Button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
