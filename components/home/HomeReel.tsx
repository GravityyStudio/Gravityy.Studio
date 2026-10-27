"use client";
import { useRef, useState } from "react";
import Image from "next/image";
import { Play } from "lucide-react";
import poster from "@/public/media/showreel-poster.jpg";
import { gsap } from "@/lib/gsap";
import { MOTION_OK } from "@/lib/motion";
import { useLazyGSAP } from "@/hooks/useLazyGSAP";
import LoopVideo from "../ui/LoopVideo";
import Modal from "../ui/Modal";

/** Full-bleed muted loop with a slow scroll drift; the button opens the full reel with sound controls. */
export default function HomeReel() {
  const ref = useRef<HTMLElement>(null);
  const [open, setOpen] = useState(false);

  useLazyGSAP(ref, () => {
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      gsap.fromTo("[data-drift]", { yPercent: -6 }, { yPercent: 6, ease: "none", scrollTrigger: { trigger: ref.current, start: "top bottom", end: "bottom top", scrub: true } });
    });
    return () => mm.revert();
  });

  return (
    <section ref={ref} aria-labelledby="reel-h" className="theme-dark relative h-[78svh] min-h-[480px] overflow-hidden bg-sunken">
      <div data-drift data-video-host className="absolute inset-[-8%_0]">
        <Image src={poster} alt="" fill sizes="100vw" placeholder="blur" className="object-cover" />
        <LoopVideo name="showreel" label="Showreel" className="absolute inset-0 h-full w-full object-cover" controlClassName="right-4 top-4 sm:right-8 sm:top-8" />
      </div>
      {/* Neutral scrim under the caption only (the allowed exception over a picture). */}
      <div aria-hidden="true" /* taste-skill-ignore: neutral scrim */ className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/70 to-transparent" />
      <div className="container-x absolute inset-x-0 bottom-0 flex items-end justify-between gap-6 pb-[clamp(32px,6vw,72px)]">
        <h2 id="reel-h" data-reveal className="text-[clamp(40px,5.2vw,84px)] font-medium leading-[1.05] tracking-[-0.02em]">
          Watch the reel
        </h2>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-haspopup="dialog"
          aria-label="Play the showreel"
          className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-fg text-bg transition-transform duration-200 hover:scale-105 active:scale-95 sm:h-24 sm:w-24"
        >
          <Play size={24} aria-hidden="true" className="ml-1" />
        </button>
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
