"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import poster from "@/public/media/showreel-poster.jpg";
import { gsap } from "@/lib/gsap";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";
import { MOTION_OK } from "@/lib/motion";
import Modal from "./ui/Modal";

/** Poster with slow scroll parallax; click opens a focus-trapped fullscreen player (Esc to close). */
export default function Showreel() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useLazyGSAP(ref, () => {
      const mm = gsap.matchMedia();
      mm.add(MOTION_OK, () => {
        gsap.fromTo("[data-reel-img]", { yPercent: -8, scale: 1.12 }, { yPercent: 8, scale: 1.12, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } });
        gsap.from("[data-reel-frame]", { clipPath: "inset(12% 8% 12% 8% round 24px)", ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "top 30%", scrub: true } });
      });
      return () => mm.revert();
  });

  return (
    <section ref={ref} aria-labelledby="reel-h" className="section !pt-0">
      <div className="container-x">
        <div data-reel-frame className="theme-dark relative overflow-hidden rounded-card border border-line" style={{ clipPath: "inset(0 0 0 0 round 24px)" }}>
          <button type="button" onClick={() => setOpen(true)} data-cursor="view" className="group relative block aspect-[16/9] w-full overflow-hidden text-left" aria-haspopup="dialog">
            <Image data-reel-img src={poster} alt="" fill sizes="(min-width:1280px) 1216px, 100vw" placeholder="blur" className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
            <span className="absolute inset-x-6 bottom-6 flex items-end justify-between gap-4 sm:inset-x-10 sm:bottom-10">
              <span>
                <span className="block font-mono text-xs uppercase tracking-[0.14em] text-fg/70">Showreel · 2026</span>
                <span id="reel-h" className="mt-2 block text-[clamp(32px,6vw,88px)] font-medium leading-none tracking-[-0.04em]">
                  Watch the reel
                </span>
              </span>
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-fg text-bg transition-transform duration-200 group-hover:scale-105 sm:h-24 sm:w-24">
                <Play size={24} aria-hidden="true" className="ml-1" />
              </span>
            </span>
          </button>
        </div>
      </div>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy="reel-modal-h" full>
        <h2 id="reel-modal-h" className="sr-only">
          Gravityy Studio showreel
        </h2>
        <video className="aspect-video w-full rounded-card bg-black" controls autoPlay muted playsInline poster={poster.src}>
          <source src="/media/showreel.webm" type="video/webm" />
          <source src="/media/showreel.mp4" type="video/mp4" />
        </video>
      </Modal>
    </section>
  );
}
