"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { prefersReduced } from "@/lib/motion";

type Props = {
  name: string; // public/media/<name>.webm|mp4
  label: string; // for the pause button
  trigger?: "view" | "hover"; // hover falls back to view on touch devices
  className?: string;
  controlClassName?: string;
  poster?: string; // only when nothing renders an optimised poster underneath: a raw poster URL downloads eagerly
};

/**
 * Muted, looping, lazy-loaded clip layered over a next/image poster (the parent renders the poster).
 * Sources attach only near the viewport; plays in view (or on hover), fades in once playing, has a pause control.
 */
export default function LoopVideo({ name, label, trigger = "view", className = "", controlClassName = "right-4 bottom-4", poster }: Props) {
  const ref = useRef<HTMLVideoElement>(null);
  const [load, setLoad] = useState(false);
  const [paused, setPaused] = useState(false); // user intent
  const [playing, setPlaying] = useState(false);
  const pausedRef = useRef(false);
  const state = useRef({ inView: false, hovering: false, hoverMode: false });

  const sync = () => {
    const v = ref.current;
    const s = state.current;
    if (!v) return;
    const want = s.inView && (!s.hoverMode || s.hovering) && !pausedRef.current;
    if (want) v.play().catch(() => {});
    else v.pause();
  };

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (prefersReduced()) {
      pausedRef.current = true;
      setPaused(true);
    }
    state.current.hoverMode = trigger === "hover" && window.matchMedia("(hover: hover)").matches;
    // Never compete with critical work: sources attach only once the page has loaded and the main thread is idle.
    let pageLoaded = false;
    let near = false;
    const ready = () => {
      pageLoaded = true;
      if (near) setLoad(true);
    };
    const idle = () => ("requestIdleCallback" in window ? requestIdleCallback(ready, { timeout: 3000 }) : setTimeout(ready, 1500));
    const onLoad = () => idle();
    if (document.readyState === "complete") idle();
    else window.addEventListener("load", onLoad, { once: true });
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          near = true;
          if (pageLoaded) setLoad(true);
        }
        state.current.inView = e.intersectionRatio >= 0.35;
        sync();
      },
      { rootMargin: "200px 0px", threshold: [0, 0.35] },
    );
    io.observe(v);
    const host = v.closest("[data-video-host]") ?? v;
    const enter = () => ((state.current.hovering = true), sync());
    const leave = () => ((state.current.hovering = false), sync());
    host.addEventListener("pointerenter", enter);
    host.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("load", onLoad);
      io.disconnect();
      host.removeEventListener("pointerenter", enter);
      host.removeEventListener("pointerleave", leave);
    };
  }, [trigger]);

  const toggle = () => {
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    sync();
  };

  return (
    <>
      <video
        ref={ref}
        className={`transition-opacity duration-700 ${playing ? "opacity-100" : "opacity-0"} ${className}`}
        muted
        loop
        playsInline
        preload="metadata"
        poster={poster}
        aria-hidden="true"
        tabIndex={-1}
        onPlaying={() => setPlaying(true)}
        onLoadedData={sync}
      >
        {load && <source src={`/media/${name}.webm`} type="video/webm" />}
        {load && <source src={`/media/${name}.mp4`} type="video/mp4" />}
      </video>
      <button
        type="button"
        onClick={toggle}
        aria-label={`${paused ? "Play" : "Pause"} ${label}`}
        className={`absolute z-10 grid h-11 w-11 place-items-center rounded-full bg-black/70 text-white transition-colors hover:bg-black/85 ${controlClassName}`}
      >
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </>
  );
}
