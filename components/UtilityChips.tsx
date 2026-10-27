"use client";
import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

// Theme presets swap only the accent and glow tokens (see app/tokens.css). "lime" is the default (no attribute).
const PALETTES = [
  { id: "lime", label: "Lime" },
  { id: "ember", label: "Ember" },
  { id: "ice", label: "Ice" },
] as const;
const SOUND_KEY = "gs-sound";
const PALETTE_KEY = "gs-palette";

const read = (k: string) => {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
};
const write = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {}
};

/**
 * Two fixed chips: bottom-left theme button (cycles accent + glow presets) and bottom-right "Sound off/on" pill.
 * Sound is off by default; when on, a short soft click plays on presses of links and buttons (Web Audio, no files).
 * Both choices are remembered per browser; storage failures (private mode) just fall back to the defaults.
 * Phones show them as 44px icon-only circles so they never sit over the content.
 */
export default function UtilityChips() {
  const [sound, setSound] = useState(false);
  const [palette, setPalette] = useState(0);
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    setSound(read(SOUND_KEY) === "on");
    const i = PALETTES.findIndex((p) => p.id === read(PALETTE_KEY));
    setPalette(i < 0 ? 0 : i);
  }, []);

  useEffect(() => {
    if (!sound) return;
    const click = (e: PointerEvent) => {
      if (!(e.target as Element | null)?.closest?.("a,button,[role='button'],[role='radio']")) return;
      const ac = (ctx.current ??= new AudioContext());
      const o = ac.createOscillator();
      const g = ac.createGain();
      o.frequency.value = 620;
      g.gain.setValueAtTime(0.04, ac.currentTime);
      g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.08);
      o.connect(g).connect(ac.destination);
      o.start();
      o.stop(ac.currentTime + 0.09);
    };
    document.addEventListener("pointerdown", click);
    return () => document.removeEventListener("pointerdown", click);
  }, [sound]);

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    write(SOUND_KEY, next ? "on" : "off");
  };
  const nextPalette = () => {
    const i = (palette + 1) % PALETTES.length;
    setPalette(i);
    const id = PALETTES[i].id;
    if (id === "lime") delete document.documentElement.dataset.palette;
    else document.documentElement.dataset.palette = id;
    write(PALETTE_KEY, id);
  };

  const chip =
    "fixed bottom-4 z-40 inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-pill bg-surface px-3 text-[13px] sm:bg-surface/85 sm:px-4 font-semibold text-fg hairline sm:backdrop-blur-md transition-colors duration-200 hover:bg-raised active:scale-[0.97] sm:bottom-6";
  return (
    <>
      <button type="button" onClick={nextPalette} className={`${chip} left-4 sm:left-6`} aria-label={`Theme: ${PALETTES[palette].label}. Switch theme`}>
        <span aria-hidden="true" className="h-3 w-3 rounded-full bg-accent shadow-[0_0_10px_rgb(var(--glow))]" />
        <span aria-hidden="true" className="hidden sm:inline">
          {PALETTES[palette].label}
        </span>
      </button>
      <button type="button" onClick={toggleSound} aria-pressed={sound} className={`${chip} right-4 sm:right-6`}>
        {sound ? <Volume2 size={16} aria-hidden="true" className="text-accent" /> : <VolumeX size={16} aria-hidden="true" className="text-muted" />}
        <span className="sr-only sm:not-sr-only">Sound {sound ? "on" : "off"}</span>
      </button>
    </>
  );
}
