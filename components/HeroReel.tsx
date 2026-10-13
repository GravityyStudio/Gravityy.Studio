"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { gsap } from "@/lib/gsap";
import { prefersReduced } from "@/lib/motion";

/** Hero background reel. Order = playback order; files live in public/media (see public/media/README.md). */
const CLIPS = ["hero", "hero-2", "hero-3", "hero-4"];
const WIPE_S = 1.2; // cut length; the next clip starts this long before the current one ends
const SHOWN = "inset(0% 0% 0% 0%)";

/**
 * Two stacked <video> layers cut through CLIPS in a loop: the incoming clip wipes in from the right over the
 * outgoing one (clip-path) while settling from a slight zoom — an editorial "reel" cut rather than a dissolve.
 * - Starts only after window load + idle; each next clip is fetched while the current one plays.
 * - Phones (<768px) get the portrait `-mobile` encodes; everything is H.264 mp4 (smallest + hardware decoded).
 * - Pauses while the hero is off-screen or the tab is hidden; user pause/play control; reduced motion = poster only.
 */
export default function HeroReel({ poster, overlay }: { poster: ReactNode; overlay: ReactNode }) {
  const a = useRef<HTMLVideoElement>(null);
  const b = useRef<HTMLVideoElement>(null);
  const [index, setIndex] = useState(0); // which clip the visible layer plays
  const [started, setStarted] = useState(false);
  const [paused, setPaused] = useState(false);
  const s = useRef({ index: 0, front: 0 as 0 | 1, paused: false, visible: true, suffix: "", switching: false, started: false });
  const startRef = useRef<() => void>(() => {});
  const fills = useRef<(HTMLSpanElement | null)[]>([]); // progress bar fills, driven directly (no re-render per frame)

  const layers = () => [a.current!, b.current!] as const;
  const src = (i: number) => `/media/${CLIPS[i % CLIPS.length]}${s.current.suffix}.mp4`;

  const playIfAllowed = (v: HTMLVideoElement) => {
    if (!s.current.paused && s.current.visible) v.play().catch(() => {});
  };

  // Advance: load the next clip into the hidden layer, start it, wipe it in on top.
  const advance = () => {
    const st = s.current;
    if (st.switching) return;
    st.switching = true;
    const [va, vb] = layers();
    const next = (st.index + 1) % CLIPS.length;
    const back = st.front === 0 ? vb : va;
    if (!back.src.endsWith(src(next))) back.src = src(next);
    back.currentTime = 0;
    playIfAllowed(back);
    const out = st.front === 0 ? va : vb;
    gsap.set(out, { zIndex: 1 });
    gsap.set(back, { zIndex: 2 });
    if (prefersReduced()) gsap.set(back, { clipPath: SHOWN, scale: 1 });
    else gsap.fromTo(back, { clipPath: "inset(0% 0% 0% 100%)", scale: 1.12 }, { clipPath: SHOWN, scale: 1, duration: WIPE_S, ease: "expo.inOut" });
    fills.current.forEach((f, i) => f && i !== next && (f.style.transform = "scaleX(0)"));
    st.index = next;
    st.front = st.front === 0 ? 1 : 0;
    setIndex(next);
    // Warm the clip after next once the swap settles.
    setTimeout(() => {
      const idle = st.front === 0 ? vb : va;
      idle.pause();
      idle.src = src(next + 1);
      idle.preload = "auto";
      st.switching = false;
    }, WIPE_S * 1000 + 100);
  };

  useEffect(() => {
    const st = s.current;
    st.suffix = window.matchMedia("(max-width: 767px)").matches ? "-mobile" : "";
    const reduced = prefersReduced();
    if (reduced) {
      st.paused = true;
      setPaused(true);
    }
    const [va, vb] = layers();

    const start = (startRef.current = () => {
      if (st.started) return;
      st.started = true;
      va.src = src(0);
      vb.src = src(1);
      vb.preload = "auto";
      setStarted(true);
      playIfAllowed(va);
    });
    const idleStart = () => ("requestIdleCallback" in window ? requestIdleCallback(start, { timeout: 3000 }) : setTimeout(start, 1500));
    // Reduced motion: nothing downloads until the visitor presses play.
    if (!reduced) {
      if (document.readyState === "complete") idleStart();
      else window.addEventListener("load", idleStart, { once: true });
    }

    const onTime = (e: Event) => {
      const v = e.currentTarget as HTMLVideoElement;
      const isFront = (st.front === 0 ? va : vb) === v;
      if (!isFront || !v.duration) return;
      const f = fills.current[st.index];
      if (f) f.style.transform = `scaleX(${Math.min(1, v.currentTime / v.duration)})`;
      if (v.duration - v.currentTime <= WIPE_S) advance();
    };
    va.addEventListener("timeupdate", onTime);
    vb.addEventListener("timeupdate", onTime);

    // Pause off-screen / hidden tab.
    const hero = document.getElementById("top");
    const sync = () => {
      const v = st.front === 0 ? va : vb;
      if (st.visible && !st.paused) v.play().catch(() => {});
      else v.pause();
    };
    const io = new IntersectionObserver(([e]) => ((st.visible = e.isIntersecting), sync()));
    if (hero) io.observe(hero);
    const onVis = () => ((st.visible = document.visibilityState === "visible"), sync());
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("load", idleStart);
      va.removeEventListener("timeupdate", onTime);
      vb.removeEventListener("timeupdate", onTime);
      io.disconnect();
      document.removeEventListener("visibilitychange", onVis);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggle = () => {
    const st = s.current;
    st.paused = !st.paused;
    setPaused(st.paused);
    const v = st.front === 0 ? a.current : b.current;
    if (!v) return;
    if (st.paused) v.pause();
    else if (!st.started) startRef.current();
    else v.play().catch(() => {});
  };

  const layer = "absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ease-out will-change-[clip-path,transform]";
  // Stacking: [scroll layer: [intro layer: poster + videos] → overlays (legibility)] → controls. data-hero-scroll gets the
  // scroll card/dim, data-hero-media the intro window reveal, so the two tweens never fight over one transform or clip.
  return (
    <>
      <div data-hero-scroll className="absolute inset-0">
        <div data-hero-media className="absolute inset-0">
          {poster}
      {[a, b].map((r, i) => (
        <video
          key={i}
          ref={r}
          muted
          playsInline
          preload="none"
          aria-hidden="true"
          tabIndex={-1}
          className={`${layer} ${started ? "opacity-100" : "opacity-0"}`}
          style={{ zIndex: i ? 1 : 2 }}
        />
      ))}
        </div>
        {/* Inside the scroll layer, so legibility gradients clip with the reel when it pulls in to a card. */}
        {overlay}
      </div>

      {/* Reel progress: clip counter + bars that fill as each clip plays. */}
      <div aria-hidden="true" className="absolute bottom-6 left-1/2 z-20 hidden -translate-x-1/2 items-center gap-4 sm:flex sm:bottom-10">
        <span className="font-mono text-[11px] tabular-nums tracking-[0.14em] text-white/70">
          {String(index + 1).padStart(2, "0")} / {String(CLIPS.length).padStart(2, "0")}
        </span>
        <span className="flex gap-1.5">
          {CLIPS.map((c, i) => (
            <span key={c} className={`relative h-[2px] overflow-hidden rounded-full bg-white/25 transition-[width] duration-700 ${started && i === index ? "w-12" : "w-4"}`}>
              <span
                ref={(el) => {
                  fills.current[i] = el;
                }}
                className={`absolute inset-0 origin-left bg-white transition-transform duration-300 ease-linear ${started && i === index ? "" : "!scale-x-0"}`}
                style={{ transform: "scaleX(0)" }}
              />
            </span>
          ))}
        </span>
      </div>

      <button
        type="button"
        onClick={toggle}
        aria-label={`${paused ? "Play" : "Pause"} background video`}
        className="absolute bottom-4 right-4 z-20 grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-black/40 text-white backdrop-blur-md transition-colors hover:bg-black/60 sm:bottom-8 sm:right-8"
      >
        {paused ? <Play size={16} aria-hidden="true" /> : <Pause size={16} aria-hidden="true" />}
      </button>
    </>
  );
}
