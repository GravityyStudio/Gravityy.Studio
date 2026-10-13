"use client";
import { useEffect, useRef, useState } from "react";
import { gsap } from "@/lib/gsap";

/** Desktop-only dot that follows the pointer, grows over links/buttons and reads "View" over case cards. */
export default function CustomCursor() {
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"dot" | "link" | "view">("dot");
  const [on, setOn] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches || !ref.current) return;
    setOn(true);
    let moved = false;
    gsap.set(ref.current, { opacity: 0 });
    document.documentElement.classList.add("has-cursor");
    const x = gsap.quickTo(ref.current, "x", { duration: 0.25, ease: "power3.out" });
    const y = gsap.quickTo(ref.current, "y", { duration: 0.25, ease: "power3.out" });
    const move = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      if (!moved) {
        moved = true;
        gsap.set(ref.current, { x: e.clientX, y: e.clientY, opacity: 1 });
      }
      x(e.clientX);
      y(e.clientY);
      const t = e.target as Element | null;
      setMode(t?.closest("[data-cursor='view']") ? "view" : t?.closest("a,button,[role='tab'],label") ? "link" : "dot");
    };
    const hide = () => gsap.to(ref.current, { opacity: 0, duration: 0.2 });
    const show = () => gsap.to(ref.current, { opacity: 1, duration: 0.2 });
    window.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hide);
    document.addEventListener("pointerenter", show);
    return () => {
      window.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      document.removeEventListener("pointerenter", show);
      document.documentElement.classList.remove("has-cursor");
    };
  }, []);

  const size = mode === "view" ? "h-20 w-20 bg-fg text-bg" : mode === "link" ? "h-10 w-10 bg-fg/15 border border-fg/60" : "h-2.5 w-2.5 bg-fg";
  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none fixed left-0 top-0 z-[300] ${on ? "" : "hidden"}`}>
      <div className={`-translate-x-1/2 -translate-y-1/2 rounded-full transition-[width,height,background-color] duration-300 ease-out grid place-items-center font-mono text-xs uppercase tracking-widest mix-blend-normal ${size}`}>
        {mode === "view" && "View"}
      </div>
    </div>
  );
}
