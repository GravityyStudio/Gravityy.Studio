"use client";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LazyMotion, MotionConfig } from "framer-motion";
import Lenis from "lenis";
import { usePathname } from "next/navigation";
import { gsap, ScrollTrigger } from "@/lib/gsap";
import { prefersReduced } from "@/lib/motion";
import ContactModal from "./ContactModal";

type UI = {
  ready: boolean;
  openContact: (prefill?: string) => void;
  lockScroll: (locked: boolean) => void;
  scrollTo: (href: string) => void;
};

const UICtx = createContext<UI>({ ready: true, openContact: () => {}, lockScroll: () => {}, scrollTo: () => {} });
export const useUI = () => useContext(UICtx);

// Framer animation features (menu, modals, page transitions, card tilt, layout reflow) load when the main thread is idle;
// nothing animates with Framer above the fold on first load. domMax adds layout animations (filters, sliding indicators).
const idle = () => new Promise<void>((r) => ("requestIdleCallback" in window ? requestIdleCallback(() => r(), { timeout: 2500 }) : setTimeout(r, 1200)));
const NAV_OFFSET = 88; // = [id] scroll-margin-top in globals.css, which Lenis already applies to scrollTo(el)
const loadFeatures = () => idle().then(() => import("framer-motion")).then((m) => m.domMax);

export default function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [contact, setContact] = useState<{ open: boolean; prefill: string }>({ open: false, prefill: "" });
  const lenis = useRef<Lenis | null>(null);

  // Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis share one clock.
  useEffect(() => {
    if (prefersReduced()) return;
    // Smooth wheel scrolling (touch keeps native momentum). Lower lerp = longer, softer glide.
    const l = new Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.current = l;
    l.on("scroll", ScrollTrigger.update);
    const tick = (t: number) => l.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      l.destroy();
      lenis.current = null;
    };
  }, []);

  // content-visibility sections change height as they render → keep ScrollTrigger positions in sync.
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    let last = document.body.scrollHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(document.body.scrollHeight - last) < 2) return;
      last = document.body.scrollHeight;
      clearTimeout(t);
      t = setTimeout(() => ScrollTrigger.refresh(), 150);
    });
    ro.observe(document.body);
    return () => (ro.disconnect(), clearTimeout(t));
  }, []);

  // Marks the app as mounted (the nav slides in). No preloader: it covered the first paint and delayed LCP.
  useEffect(() => {
    setReady(true);
    document.documentElement.dataset.ready = "1";
  }, []);

  const openContact = useCallback((prefill?: string) => {
    setContact((c) => ({ open: true, prefill: typeof prefill === "string" ? prefill : c.prefill }));
  }, []);
  const closeContact = useCallback(() => setContact((c) => ({ ...c, open: false })), []);
  const lockScroll = useCallback((locked: boolean) => {
    if (locked) lenis.current?.stop();
    else lenis.current?.start();
    document.documentElement.style.overflow = locked ? "hidden" : "";
  }, []);

  // Smooth in-page navigation. Sections below may grow as content-visibility renders them mid-scroll,
  // so after landing we re-check and correct (max twice). Focus moves to the target for keyboard/AT users.
  const scrollTo = useCallback((href: string) => {
    const el = document.querySelector<HTMLElement>(href);
    if (!el) return;
    const l = lenis.current;
    l?.start();
    document.documentElement.style.overflow = "";
    // Move focus to the target on landing, unless the user has already focused something else mid-scroll.
    const before = document.activeElement;
    const focus = () => {
      const now = document.activeElement;
      if (now && now !== before && now !== document.body) return;
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "-1");
      el.focus({ preventScroll: true });
    };
    if (l) {
      // Render skipped (content-visibility) sections at their real height first so the target is exact;
      // `contain-intrinsic-size: auto` remembers those sizes after the class is removed.
      const root = document.documentElement;
      root.classList.add("cv-off");
      void document.body.offsetHeight;
      const settle = (n: number) =>
        l.scrollTo(el, {
          force: true,
          ...(n ? { duration: 0.4 } : {}),
          onComplete: () => {
            if (n < 2 && Math.abs(el.getBoundingClientRect().top - NAV_OFFSET) > 4) return settle(n + 1);
            root.classList.remove("cv-off");
            focus();
          },
        });
      settle(0);
    } else {
      const root = document.documentElement;
      root.classList.add("cv-off");
      el.scrollIntoView({ behavior: prefersReduced() ? "auto" : "smooth" });
      focus();
      setTimeout(() => root.classList.remove("cv-off"), 1000);
    }
    history.replaceState(null, "", href);
  }, []);

  // Route change: land at the top (or on the #hash target), then re-measure every ScrollTrigger for the new page.
  const path = usePathname();
  useEffect(() => {
    let id = requestAnimationFrame(() => {
      id = requestAnimationFrame(() => {
        const hash = window.location.hash;
        if (hash.length > 1 && document.querySelector(hash)) scrollTo(hash);
        else {
          lenis.current?.scrollTo(0, { immediate: true, force: true });
          window.scrollTo(0, 0);
        }
        ScrollTrigger.refresh();
      });
    });
    return () => cancelAnimationFrame(id);
  }, [path, scrollTo]);
  // Card spotlight (.spotlight in globals.css): one delegated listener feeds the pointer position to the hovered card.
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    const move = (e: PointerEvent) => {
      const card = (e.target as Element | null)?.closest?.<HTMLElement>(".spotlight");
      if (!card) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${e.clientX - r.left}px`);
      card.style.setProperty("--my", `${e.clientY - r.top}px`);
    };
    document.addEventListener("pointermove", move, { passive: true });
    return () => document.removeEventListener("pointermove", move);
  }, []);

  // Every same-page "#id" link goes through scrollTo (one place, works with Lenis and pins).
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.('a[href^="#"]');
      const href = a?.getAttribute("href");
      if (!href || href.length < 2 || !document.querySelector(href)) return;
      e.preventDefault();
      scrollTo(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [scrollTo]);

  return (
    <UICtx.Provider value={{ ready, openContact, lockScroll, scrollTo }}>
      <LazyMotion features={loadFeatures} strict>
        {/* reducedMotion="user": Framer drops transform animations when the OS asks for reduced motion */}
        <MotionConfig reducedMotion="user">
          {children}
          <ContactModal open={contact.open} prefill={contact.prefill} onClose={closeContact} />
        </MotionConfig>
      </LazyMotion>
    </UICtx.Provider>
  );
}
