"use client";
import { useEffect, useId, useRef, useState } from "react";
import Link from "@/components/ui/SmartLink";
import { usePathname } from "next/navigation";
import { AnimatePresence, m } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { useContent } from "./ContentProvider";
import { useUI } from "./Providers";
import Button from "./ui/Button";
import BrandMark from "./ui/BrandMark";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { useViewer, type NavViewer } from "@/hooks/useViewer";
import type { Case } from "@/lib/casePosters";

/** "/services/web" is inside "Services"; "/" only matches exactly. */
const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path === href || path.startsWith(href + "/"));
const EASE = [0.22, 1, 0.36, 1] as const;
const morph = "transition-[transform,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)]";
type SubLink = { label: string; href: string; hint?: string };

/** Two-line hamburger; the lines rotate into an X when `open`. */
function Burger({ open }: { open: boolean }) {
  const line = "absolute left-0 block h-[2px] w-[18px] rounded-full bg-current transition-transform duration-500 ease-[cubic-bezier(.22,1,.36,1)]";
  return (
    <span aria-hidden="true" className="relative block h-3.5 w-[18px]">
      <span className={`${line} top-[2px] ${open ? "translate-y-[4px] rotate-45" : ""}`} />
      <span className={`${line} bottom-[2px] ${open ? "-translate-y-[4px] -rotate-45" : ""}`} />
    </span>
  );
}

/** Language pill. English is the only translation so far; Hindi is shown as coming soon (not selectable). */
function LangPill({ className = "" }: { className?: string }) {
  return (
    <div role="group" aria-label="Language" className={`inline-flex items-center rounded-pill p-1 hairline ${className}`}>
      <button type="button" aria-pressed="true" className="min-h-[36px] rounded-pill bg-fg px-3 text-[13px] font-semibold text-bg">
        EN
      </button>
      <button type="button" aria-disabled="true" title="Hindi is coming soon" className="group/soon relative min-h-[36px] cursor-not-allowed rounded-pill px-3 text-[13px] text-muted">
        हिं
        <span className="sr-only"> (coming soon)</span>
        <span aria-hidden="true" className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap rounded-pill bg-surface px-2.5 py-1 text-[12px] text-fg opacity-0 shadow-panel transition-opacity group-hover/soon:opacity-100 group-focus-visible/soon:opacity-100">
          Coming soon
        </span>
      </button>
    </div>
  );
}

/** "Client login", or once signed in "Dashboard" with a profile initial. */
function Account({ viewer, loginHref, className = "" }: { viewer: NavViewer; loginHref: string; className?: string }) {
  if (!viewer.signedIn)
    return (
      <Link href={loginHref} className={`inline-flex min-h-[44px] items-center rounded-pill px-3 text-[15px] text-muted transition-colors hover:text-fg ${className}`}>
        Client login
      </Link>
    );
  return (
    <Link href={viewer.href} className={`group inline-flex min-h-[44px] items-center gap-2 rounded-pill py-1 pl-1 pr-4 text-[15px] font-medium hairline transition-colors hover:bg-fg/[0.06] ${className}`}>
      <span aria-hidden="true" className="grid h-8 w-8 place-items-center rounded-full bg-accent text-[14px] font-bold uppercase text-on-accent">
        {viewer.name.slice(0, 1)}
      </span>
      Dashboard
      <span className="sr-only">, signed in as {viewer.name}</span>
    </Link>
  );
}

/**
 * A top-level link with an optional dropdown. The label stays a normal link; the chevron button (aria-expanded) opens
 * the panel, and so does hovering on devices that hover. Esc or moving focus away closes it.
 */
function NavItem({ label, href, items, path }: { label: string; href: string; items?: SubLink[]; path: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const btn = useRef<HTMLButtonElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const active = isActive(path, href);
  useEffect(() => setOpen(false), [path]);
  const hover = (on: boolean) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(on), on ? 60 : 160);
  };
  const link = `inline-flex min-h-[44px] items-center text-[15px] transition-colors duration-200 hover:text-fg ${active ? "text-fg" : "text-muted"}`;

  if (!items?.length)
    return (
      <li>
        <Link href={href} aria-current={active ? "page" : undefined} className={`${link} px-3`}>
          {label}
        </Link>
      </li>
    );
  return (
    <li
      className="relative flex items-center"
      onPointerEnter={(e) => e.pointerType === "mouse" && hover(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && hover(false)}
      onKeyDown={(e) => e.key === "Escape" && open && (setOpen(false), btn.current?.focus())}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <Link href={href} aria-current={active ? "page" : undefined} className={`${link} pl-3`}>
        {label}
      </Link>
      <button
        ref={btn}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        aria-label={`${label} menu`}
        onClick={() => setOpen((o) => !o)}
        className="grid h-11 w-8 place-items-center text-muted transition-colors hover:text-fg"
      >
        <ChevronDown size={15} aria-hidden="true" className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <m.div
            id={id}
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, transition: { duration: 0.15 } }}
            transition={{ duration: 0.3, ease: EASE }}
            className="absolute left-1/2 top-full z-10 w-[min(560px,80vw)] -translate-x-1/2 pt-3"
          >
            <ul className="grid gap-1 rounded-xl bg-surface/95 p-3 shadow-panel backdrop-blur-md sm:grid-cols-2">
              {items.map((it) => (
                <li key={it.href}>
                  <Link href={it.href} className="flex min-h-[44px] flex-col justify-center rounded-lg px-3 py-2 transition-colors hover:bg-fg/[0.06]">
                    <span className="text-[15px] font-medium text-fg">{it.label}</span>
                    {it.hint && <span className="text-[13px] text-muted">{it.hint}</span>}
                  </Link>
                </li>
              ))}
              <li className="sm:col-span-2">
                <Link href={href} className="flex min-h-[44px] items-center rounded-lg px-3 text-[15px] font-semibold text-accent transition-colors hover:bg-fg/[0.06]">
                  All {label.toLowerCase()} →
                </Link>
              </li>
            </ul>
          </m.div>
        )}
      </AnimatePresence>
    </li>
  );
}

/**
 * Morphing navigation. At the top of the page a full-width bar: logo, links (Services and Work open dropdowns), the
 * language pill, client login or Dashboard, and the lime CTA. Scrolling down past ~80px morphs it into a floating,
 * centred pill with a blur backdrop (logo mark, CTA, menu button); scrolling up brings the bar back. The two swap by
 * transform + opacity and the hidden one is `inert`. Phones always get the pill. The menu button (two-line burger)
 * opens a full-screen overlay with staggered links (focus trapped, Esc closes, aria-expanded on the toggle).
 */
export default function Navbar() {
  const { site, services, cases } = useContent();
  const { lockScroll } = useUI();
  const path = usePathname();
  const viewer = useViewer(path);
  const [scrolled, setScrolled] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const close = () => setOpen(false);
  const links = site.NAV.filter((l) => l.href !== "/").slice(0, 5);
  const dropdowns: Record<string, SubLink[]> = {
    "/services": services.slice(0, 8).map((s) => ({ label: s.name, href: `/services/${s.id}` })),
    "/work": (cases as Case[]).slice(0, 6).map((c) => ({ label: c.title.split(":")[0], href: `/work/${c.slug}`, hint: c.sector })),
  };

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => setDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    // Pill once past 80px while scrolling down; the full bar comes back on any deliberate scroll up (>6px).
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (y <= 80) setScrolled(false);
      else if (Math.abs(y - last) > 6) setScrolled(y > last);
      else return;
      last = y;
    };
    setScrolled(last > 80);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => lockScroll(open), [open, lockScroll]);
  useFocusTrap(panel, open, close);

  const cta = (
    <Button href="#audit" variant="accent" className="!min-h-[44px] !px-5 text-[15px]">
      Get a free audit
    </Button>
  );

  return (
    <>
      <header className="nav-intro fixed inset-x-0 top-0 z-50">
        {/* Full bar: desktop, top of page (and on scroll up) */}
        <nav
          aria-label="Primary"
          inert={!desktop || scrolled}
          className={`container-x hidden h-[76px] items-center justify-between gap-4 lg:flex ${morph} ${scrolled ? "pointer-events-none -translate-y-6 opacity-0" : ""}`}
        >
          <Link href="/" className="flex min-h-[44px] shrink-0 items-center gap-2.5 text-[17px] font-semibold" aria-label="Gravityy Studio, home">
            <BrandMark height={24} priority />
            <span aria-hidden="true">Gravityy Studio</span>
          </Link>
          <ul className="flex items-center">
            {links.map((l) => (
              <NavItem key={l.href} label={l.label} href={l.href} items={dropdowns[l.href]} path={path} />
            ))}
          </ul>
          <div className="flex items-center gap-2">
            <LangPill className="hidden xl:inline-flex" />
            <Account viewer={viewer} loginHref={site.clientLoginHref} />
            {cta}
          </div>
        </nav>

        {/* Floating centred pill: phones always; desktop after scrolling down */}
        <nav
          aria-label="Primary"
          inert={desktop && !scrolled}
          className={`absolute inset-x-0 top-3 flex justify-center px-3 ${morph} ${scrolled ? "" : "lg:pointer-events-none lg:-translate-y-3 lg:scale-95 lg:opacity-0"}`}
        >
          <div className="flex items-center gap-2 rounded-pill bg-surface/75 py-1.5 pl-3 pr-1.5 shadow-hairline backdrop-blur-xl">
            <Link href="/" className="grid h-11 w-11 shrink-0 place-items-center" aria-label="Gravityy Studio, home">
              <BrandMark height={22} />
            </Link>
            {cta}
            <button
              type="button"
              onClick={() => setOpen(true)}
              aria-expanded={open}
              aria-controls="site-menu"
              aria-label="Open menu"
              className="grid h-11 w-11 place-items-center rounded-pill shadow-hairline transition-colors hover:bg-fg/[0.06]"
            >
              <Burger open={open} />
            </button>
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
            className="fixed inset-0 z-[70] flex flex-col overflow-y-auto bg-bg/95 px-5 pb-8 pt-4 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="mx-auto flex w-full max-w-[1280px] items-center justify-between">
              <Link href="/" onClick={close} className="grid h-11 w-11 place-items-center" aria-label="Gravityy Studio, home">
                <BrandMark height={22} />
              </Link>
              <button type="button" onClick={close} aria-label="Close menu" className="grid h-11 w-11 place-items-center rounded-pill shadow-hairline">
                <Burger open />
              </button>
            </div>
            <m.ul
              className="mx-auto mt-10 flex w-full max-w-[1280px] flex-col"
              initial="hide"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.06, delayChildren: 0.08 } } }}
            >
              {site.NAV.map((l) => (
                <m.li key={l.href} className="overflow-hidden" variants={{ hide: { y: "100%", opacity: 0 }, show: { y: 0, opacity: 1, transition: { duration: 0.6, ease: EASE } } }}>
                  <Link
                    href={l.href}
                    onClick={close}
                    aria-current={isActive(path, l.href) ? "page" : undefined}
                    className={`display flex min-h-[56px] items-center !text-[clamp(40px,9vw,88px)] transition-colors hover:text-accent ${isActive(path, l.href) ? "text-accent" : "text-fg"}`}
                  >
                    {l.label}
                  </Link>
                </m.li>
              ))}
            </m.ul>
            <m.div
              className="mx-auto mt-auto flex w-full max-w-[1280px] flex-wrap items-center gap-3 pt-10"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: 0.45, duration: 0.5, ease: EASE } }}
            >
              <Button href="#audit" variant="accent" onClick={close}>
                Get a free audit
              </Button>
              <Account viewer={viewer} loginHref={site.clientLoginHref} />
              <LangPill className="ml-auto" />
            </m.div>
          </m.div>
        )}
      </AnimatePresence>
    </>
  );
}
