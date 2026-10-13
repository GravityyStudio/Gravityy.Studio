// Hero reel check (needs `npm start`): all clips play in order, pause/play works, phones get -mobile encodes,
// reduced motion downloads nothing. Run: node scripts/hero-reel.mjs
import { chromium } from "playwright";
import assert from "node:assert/strict";
const b = await chromium.launch();
const state = (p) =>
  p.evaluate(() => {
    const vids = [...document.querySelectorAll("#top video")];
    // Front = the visible layer on top (cuts wipe the incoming layer in above the outgoing one).
    const front = vids.find((v) => v.style.zIndex === "2" && getComputedStyle(v).opacity === "1");
    return { front: front?.currentSrc.split("/").pop() ?? null, playing: front ? !front.paused : false, srcs: vids.map((v) => v.currentSrc.split("/").pop()) };
  });

// Desktop: reel advances through the clips
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const media = [];
  p.on("response", (r) => r.url().includes("/media/hero") && media.push(r.url().split("/").pop()));
  await p.goto("http://localhost:3000", { waitUntil: "load" });
  const seen = new Set();
  for (let t = 0; t < 26; t++) {
    await p.waitForTimeout(1000);
    const s = await state(p);
    if (s.front) seen.add(s.front);
    if (t === 3) await p.screenshot({ path: "shots/reel-1440-a.png" });
    if (t === 9) await p.screenshot({ path: "shots/reel-1440-b.png" });
    if (t === 15) await p.screenshot({ path: "shots/reel-1440-c.png" });
    if (t === 21) await p.screenshot({ path: "shots/reel-1440-d.png" });
  }
  console.log("desktop clips shown:", [...seen].join(", "));
  console.log("desktop media requested:", [...new Set(media)].join(", "));
  assert.ok(seen.size >= 4, "all 4 clips should have played");
  // Pause control
  await p.getByRole("button", { name: "Pause background video" }).click();
  await p.waitForTimeout(500);
  assert.equal((await state(p)).playing, false);
  await p.getByRole("button", { name: "Play background video" }).click();
  await p.waitForTimeout(500);
  assert.equal((await state(p)).playing, true);
  console.log("pause/play ok");
  await p.close();
}
// Mobile: portrait encodes
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 }, isMobile: true });
  await p.goto("http://localhost:3000", { waitUntil: "load" });
  await p.waitForTimeout(4000);
  const s = await state(p);
  console.log("mobile:", JSON.stringify(s));
  assert.ok(s.front?.includes("-mobile"));
  await p.screenshot({ path: "shots/reel-390.png" });
  await p.close();
}
// Reduced motion: no playback
{
  const p = await b.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  await p.goto("http://localhost:3000", { waitUntil: "load" });
  await p.waitForTimeout(4000);
  const s = await state(p);
  console.log("reduced:", JSON.stringify(s));
  assert.equal(s.playing, false);
  assert.deepEqual(s.srcs, ["", ""], "reduced motion: no clip downloaded until play");
  await p.close();
}
await b.close();
console.log("reel ok");
