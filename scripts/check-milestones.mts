// Milestone text ⇄ JSON (admin project editor). Run: npx tsx scripts/check-milestones.mts
import assert from "node:assert/strict";
import { formatMilestones, parseMilestones } from "../lib/resources.ts";

const text = "[x] Design sign-off | 2026-11-01\n[ ] Build\n\n  Launch | 2026-12-15  ";
const ms = parseMilestones(text);
assert.deepEqual(ms, [
  { title: "Design sign-off", due: "2026-11-01", done: true },
  { title: "Build", due: null, done: false },
  { title: "Launch", due: "2026-12-15", done: false },
]);
assert.deepEqual(parseMilestones(formatMilestones(ms)), ms); // round trip
assert.equal(formatMilestones(null), "");
console.log("milestones ok");
