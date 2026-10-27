"use client";
import { useEffect, useState } from "react";
import { prefersReduced } from "@/lib/motion";

/**
 * Decorative background loop behind a hero. Desktop only, never under reduced motion or Save-Data, and attached only
 * after the page has loaded and gone idle, so it never competes with the LCP text. Fades in once it plays.
 */
export default function BgVideo({ src, className = "" }: { src: string; className?: string }) {
  const [on, setOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
    if (prefersReduced() || conn?.saveData || !window.matchMedia("(min-width: 1024px)").matches) return;
    const start = () => ("requestIdleCallback" in window ? requestIdleCallback(() => setOn(true), { timeout: 3000 }) : setTimeout(() => setOn(true), 1500));
    if (document.readyState === "complete") start();
    else window.addEventListener("load", start, { once: true });
    return () => window.removeEventListener("load", start);
  }, []);
  if (!on) return null;
  return (
    <video
      aria-hidden="true"
      tabIndex={-1}
      muted
      loop
      autoPlay
      playsInline
      preload="auto"
      onPlaying={() => setPlaying(true)}
      className={`pointer-events-none absolute inset-0 -z-10 h-full w-full object-cover transition-opacity duration-1000 [mask-image:linear-gradient(to_bottom,black_55%,transparent)] ${playing ? "opacity-35" : "opacity-0"} ${className}`}
      src={src}
    />
  );
}
