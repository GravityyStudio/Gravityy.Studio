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

type Chapter = "dark" | "paper" | "accent";
// The bar takes the field of the chapter beneath it (sections mark themselves with data-chapter); default is the page ground.
const CHAPTER: Record<Chapter, string> = { dark: "bg-bg text-fg", paper: "chapter-paper", accent: "chapter-accent" };

export default function Navbar() {
  const { site } = useContent();
  const { openContact, lockScroll } = useUI();
  const path = usePathname();
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const [chapter, setChapter] = useState<Chapter>("dark");
  const panel = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLElement>(null);
  const close = () => setOpen(false);
  const links = site.NAV.filter((l) => l.href !== "/").slice(0, 5);

  // Hide on scroll down, reveal on scroll up; read the chapter under the bar on every frame that scrolls.
  useEffect(() => {
    let last = window.scrollY;
    let frame = 0;
    const read = () => {
      frame = 0;
      const y = (bar.current?.offsetHeight ?? 64) / 2;
      const under = document.elementsFromPoint(window.innerWidth / 2, y).find((el) => !bar.current?.contains(el));
      setChapter(((under?.closest("[data-chapter]") as HTMLElement | null)?.dataset.chapter as Chapter) ?? "dark");
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(read);
      const y = window.scrollY;
      if (Math.abs(y - last) < 6) return;
      setHidden(y > last && y > 120);
      last = y;
    };
    read();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [path]);

  // Close the menu and show the bar on every route change.
  useEffect(() => {
    setOpen(false);
    setHidden(false);
  }, [path]);

  useEffect(() => lockScroll(open), [open, lockScroll]);
  useFocusTrap(panel, open, close);

  return (
    <>
      <header
        ref={bar}
        className={`nav-intro fixed inset-x-0 top-0 z-50 transition-[transform,background-color,color] duration-300 ${CHAPTER[chapter] ?? CHAPTER.dark} ${hidden && !open ? "-translate-y-full" : ""}`}
      >
        <nav aria-label="Primary" className="container-x flex h-16 items-center justify-between gap-4 lg:h-[72px]">
          <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-2.5 text-[17px] font-semibold tracking-[-0.03em]" aria-label="Gravityy Studio, home">
            <BrandMark height={24} priority />
            <span aria-hidden="true" className="hidden sm:inline">
              Gravityy Studio
            </span>
          </Link>
          <ul className="hidden items-center gap-1 lg:flex">
            {links.map((l) => {
              const on = isActive(path, l.href);
              return (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    aria-current={on ? "page" : undefined}
                    className={`inline-flex min-h-[44px] items-center px-3 text-[15px] underline-offset-[6px] transition-colors hover:underline ${on ? "underline decoration-2" : ""}`}
                  >
                    {l.label}
                  </Link>
                </li>
              );
            })}
          </ul>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href={site.clientLoginHref} className="hidden min-h-[44px] items-center px-3 text-[15px] hover:underline hover:underline-offset-[6px] xl:inline-flex">
              Client login
            </Link>
            <Button onClick={() => openContact()} className="!min-h-[40px] !px-4 sm:!min-h-[44px] sm:!px-5">
              Start a project
            </Button>
            <button type="button" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="mobile-menu" className="inline-flex min-h-[44px] items-center px-2 text-[15px] font-medium lg:hidden">
              Menu
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
              className="fixed inset-y-0 right-0 z-[70] flex w-[min(380px,90vw)] flex-col gap-8 overflow-y-auto bg-surface-2 p-6 lg:hidden"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={FM.panel}
            >
              <div className="flex items-center justify-between">
                <ThemeToggle />
                <button type="button" onClick={close} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-full bg-raised">
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
              <m.ul className="flex flex-col gap-1" initial="hide" animate="show" variants={{ show: { transition: { staggerChildren: 0.05, delayChildren: 0.1 } } }}>
                {site.NAV.map((l) => {
                  const on = isActive(path, l.href);
                  return (
                    <m.li key={l.href} variants={{ hide: { opacity: 0, x: 24 }, show: { opacity: 1, x: 0 } }}>
                      <Link
                        href={l.href}
                        onClick={close}
                        aria-current={on ? "page" : undefined}
                        className={`flex min-h-[52px] items-center justify-between text-[28px] font-medium tracking-[-0.03em] ${on ? "text-fg" : "text-fg/80"}`}
                      >
                        {l.label}
                        {on && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-accent" />}
                      </Link>
                    </m.li>
                  );
                })}
              </m.ul>
              <div className="mt-auto flex flex-col gap-3">
                <Button onClick={() => (close(), openContact())}>Start a project</Button>
                <Button href={site.clientLoginHref} variant="ghost">
                  Client login
                </Button>
              </div>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
