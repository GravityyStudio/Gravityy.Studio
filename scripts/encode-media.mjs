// Encodes source footage (e.g. Pexels downloads) into the site's media set.
// Usage: node scripts/encode-media.mjs <dir-with-raw-mp4s>
// Each raw file is named after its slot (hero.mp4, case-1.mp4 …). Output → public/media/<slot>.{webm,mp4} + <slot>-poster.jpg
import { execFileSync } from "node:child_process";
import { existsSync, statSync } from "node:fs";
import { join } from "node:path";
import ffmpeg from "ffmpeg-static";

const SRC = process.argv[2];
if (!SRC) throw new Error("Pass the folder containing raw clips");
const OUT = "public/media";

// slot: [start s, duration s, output width, extra CRF for busy footage, extra ffmpeg filter (e.g. hue shift to brand lime)]. Loops stay < 6 s; the showreel plays in a modal, so it may run longer.
const SLOTS = {
  hero: [0, 5.5, 1920, 5],
  // Hero reel (crossfades after "hero"): Pexels #34127918, Pixabay #27669, Pixabay #201735.
  "hero-2": [4, 5.5, 1920, 5],
  "hero-3": [1, 5.5, 1920, 5, "hue=h=55:s=0.75"], // gold → lime
  "hero-4": [3, 5.5, 1920, 13, "hue=h=-130:s=0.6"], // blue → lime; fine line detail needs a higher CRF to stay < 3 MB
  showreel: [0, 10, 1920, 3],
  solutions: [0, 4.8, 1280],
  process: [3, 5, 1280],
  "case-1": [0, 5, 1280],
  "case-2": [0, 5, 1280],
  "case-3": [1, 5, 1280],
  "case-4": [2, 5, 1280],
};

// Slightly desaturated, darker grade so stock footage sits consistently in the dark UI.
const GRADE = "eq=saturation=0.82:brightness=-0.04:contrast=1.04";
const run = (args) => execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });
const kb = (f) => Math.round(statSync(f).size / 1024);

function encode(input, name, start, dur, vf, q = 0) {
  const base = ["-ss", String(start), "-t", String(dur), "-i", input, "-an", "-vf", `${vf},${GRADE},fps=30,format=yuv420p`];
  run([...base, "-c:v", "libx264", "-preset", "slow", "-crf", String(27 + q), "-maxrate", "4M", "-bufsize", "8M", "-movflags", "+faststart", join(OUT, `${name}.mp4`)]);
  // The hero reel plays H.264 only (smallest, hardware-decoded everywhere), so hero slots skip VP9.
  if (!name.startsWith("hero")) run([...base, "-c:v", "libvpx-vp9", "-crf", String(37 + q), "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "3", join(OUT, `${name}.webm`)]);
}

for (const [slot, [start, dur, width, q = 0, fx]] of Object.entries(SLOTS)) {
  const input = join(SRC, `${slot}.mp4`);
  if (!existsSync(input)) {
    console.log(`skip ${slot} (no source)`);
    continue;
  }
  const pre = fx ? `${fx},` : "";
  encode(input, slot, start, dur, `${pre}scale=${width}:-2`, q);
  // Loops use their opening frame (video fades in over it); the showreel poster is taken mid-clip where it is brightest.
  const posterAt = slot === "showreel" ? start + 4 : start + 0.4;
  run(["-ss", String(posterAt), "-i", input, "-frames:v", "1", "-vf", `${pre}scale=${width}:-2,${GRADE}`, "-q:v", "3", join(OUT, `${slot}-poster.jpg`)]);
  console.log(`${slot}: mp4 ${kb(join(OUT, slot + ".mp4"))}KB, poster ${kb(join(OUT, slot + "-poster.jpg"))}KB`);
  if (slot.startsWith("hero")) {
    // Portrait centre crop for phones (cheaper decode, better framing): hero → hero-mobile, hero-2 → hero-2-mobile …
    const m = `${slot}-mobile`;
    encode(input, m, start, dur, `${pre}crop=ih*9/16:ih,scale=720:1280`, q + 4);
    console.log(`${m}: mp4 ${kb(join(OUT, m + ".mp4"))}KB`);
  }
}
