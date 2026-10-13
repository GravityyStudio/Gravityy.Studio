// Generates dark abstract placeholder loops (webm + mp4) and posters (jpg) into public/media.
// Run: npm run media. Replace outputs with real footage using the same file names (see public/media/README.md).
import { execFileSync } from "node:child_process";
import { statSync, mkdirSync } from "node:fs";
import ffmpeg from "ffmpeg-static";

const OUT = "public/media";
mkdirSync(OUT, { recursive: true });

// name, size, seconds, gradient colours (dark, tinted), gradient type
const CLIPS = [
  ["hero", "1920x1080", 5, ["0x0a0a0a", "0x1a2a06", "0x0d0d0d", "0x2c4410"], "radial"],
  ["hero-mobile", "720x1280", 5, ["0x0a0a0a", "0x1a2a06", "0x0d0d0d", "0x2c4410"], "radial"], // portrait, cheap to decode on phones
  ["showreel", "1920x1080", 6, ["0x0a0a0a", "0x22320c", "0x141414", "0x0a0a0a"], "spiral"],
  ["case-1", "1280x720", 4, ["0x0b0b0b", "0x2a1d16", "0x121212", "0x3a2a1e"], "radial"],
  ["case-2", "1280x720", 4, ["0x0b0b0b", "0x10202a", "0x121212", "0x173040"], "linear"],
  ["case-3", "1280x720", 4, ["0x0b0b0b", "0x1d2a10", "0x121212", "0x2c4410"], "circular"],
  ["case-4", "1280x720", 4, ["0x0b0b0b", "0x221830", "0x121212", "0x302244"], "radial"],
  ["process", "1280x720", 5, ["0x0a0a0a", "0x161f0a", "0x0f0f0f", "0x1a1a1a"], "linear"],
  ["solutions", "1280x720", 5, ["0x0a0a0a", "0x1a1a1a", "0x10180a", "0x0f0f0f"], "circular"],
];

const run = (args) => execFileSync(ffmpeg, ["-y", "-hide_banner", "-loglevel", "error", ...args], { stdio: "inherit" });

for (const [name, size, d, c, type] of CLIPS) {
  const src = `gradients=s=${size}:d=${d}:r=30:speed=0.012:n=4:type=${type}:seed=${name.length * 7}:c0=${c[0]}:c1=${c[1]}:c2=${c[2]}:c3=${c[3]}`;
  // Grain + vignette for a filmic look. ponytail: loop seam is not crossfaded; real footage replaces these.
  const vf = `noise=alls=7:allf=t,vignette=PI/4.5,format=yuv420p`;
  const base = ["-f", "lavfi", "-i", src, "-vf", vf, "-an"];
  run([...base, "-c:v", "libx264", "-preset", "slow", "-crf", "30", "-movflags", "+faststart", `${OUT}/${name}.mp4`]);
  run([...base, "-c:v", "libvpx-vp9", "-crf", "42", "-b:v", "0", "-row-mt", "1", "-deadline", "good", "-cpu-used", "4", `${OUT}/${name}.webm`]);
  // Posters get visible film grain: realistic texture, and keeps the hero poster above Chrome's
  // low-entropy LCP cut-off (smooth gradients are ignored as LCP candidates).
  const kb = (f) => Math.round(statSync(`${OUT}/${f}`).size / 1024);
  if (name.endsWith("-mobile")) {
    console.log(`${name}: mp4 ${kb(name + ".mp4")}KB, webm ${kb(name + ".webm")}KB (uses the desktop poster)`);
    continue;
  }
  run(["-i", `${OUT}/${name}.mp4`, "-frames:v", "1", "-vf", "noise=alls=24:allf=u", "-q:v", "4", `${OUT}/${name}-poster.jpg`]);
  console.log(`${name}: mp4 ${kb(name + ".mp4")}KB, webm ${kb(name + ".webm")}KB, poster ${kb(name + "-poster.jpg")}KB`);
}
