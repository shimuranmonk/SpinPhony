import type { Drill } from "./catalog.js";
import { cycleDuration, validateTrack } from "./generator.js";
import type { Cue } from "./generator.js";
import type { Track } from "./rhythm.js";

const shortMin = 3000;
const shortMax = 4000;
const longRecovery = 8000;
const workTarget = 18000;
const workLimit = 22000;

type Practice = { drill: Drill; minimum: number; maximum: number };
type Slot = Practice & { restMin: number; restMax: number };

function movement(drill: Drill) {
  const placements = drill.parameters?.map(ball => ball.DROP) ?? drill.balls.map(ball => ball.drop);
  return Math.max(...placements) - Math.min(...placements);
}

function pairTransition(
  markers: Map<number, number>, earliest: number, latest: number,
  restMin: number, restMax: number, target: number,
  firstNext = earliest + restMin, lastNext = latest + restMax,
) {
  const ideal = Math.max(earliest, Math.min(latest, target));
  const restTarget = (restMin + restMax) / 2;
  const times = [earliest, latest, ideal, firstNext, lastNext, ...markers.keys()];
  const starts = new Set(times.flatMap(time => [time, time - restMin, time - restMax, time - restTarget]));
  let best = { recovery: ideal, next: ideal + restTarget };
  let bestScore = -Infinity;
  for (const recovery of starts) {
    if (recovery < earliest || recovery > latest) continue;
    const first = Math.max(firstNext, recovery + restMin);
    const last = Math.min(lastNext, recovery + restMax);
    for (const next of [...times, Math.max(first, Math.min(last, recovery + restTarget))]) {
      if (next < first || next > last) continue;
      const score = (markers.get(recovery) ?? 0) + 1.25 * (markers.get(next) ?? 0)
        - Math.abs(recovery - ideal) / 2500 - Math.abs(next - recovery - restTarget) / 2000;
      if (score <= bestScore) continue;
      best = { recovery, next };
      bestScore = score;
    }
  }
  return best;
}

export function scheduleAuto(track: Track, drills: Drill[], bpm: number) {
  validateTrack(track);
  const ordered = drills.filter(drill => drill.balls.length).sort((a, b) =>
    movement(a) - movement(b) || Number(a.random) - Number(b.random) || a.balls.length - b.balls.length);
  const pool = ordered.map(drill => {
    const minimum = Math.ceil(cycleDuration(drill, bpm)) + 1;
    return { drill, minimum, maximum: Math.max(workLimit, minimum) };
  });
  const end = track.durationMs;
  const practice: Practice[] = [];
  let reserved = 0;
  for (const pattern of pool) {
    const required = pattern.minimum + shortMin;
    if (reserved + required > end) continue;
    practice.push(pattern);
    reserved += required;
  }
  if (!practice.length) throw new Error("No complete practice cycle and recovery fit. Try a longer track or a shorter drill.");
  const unused = drills.filter(drill => !practice.some(pattern => pattern.drill === drill));

  const targetBlocks = Math.round((end - 2 * (longRecovery - shortMin)) / (workTarget + shortMin));
  const used = [...practice];
  let repeat = 0;
  // Give every feasible selection its own block before repeating the progression.
  while (used.length < targetBlocks || used.length < 3 || used.reduce((sum, p) => sum + p.maximum + shortMax, 0) < end - 2 * (longRecovery - shortMax)) {
    const pattern = practice[repeat % practice.length];
    if (reserved + pattern.minimum + shortMin + 2 * (longRecovery - shortMin) > end) break;
    used.push(pattern);
    repeat++;
    reserved += pattern.minimum + shortMin;
  }
  const longCount = Math.min(2, used.length, Math.floor((end - reserved) / (longRecovery - shortMin)));
  const longIndices = new Set(Array.from({ length: longCount }, (_, index) =>
    Math.max(index, Math.floor((used.length - 1) * (index + 1) / (longCount + 1)))));
  const slots: Slot[] = used.map((pattern, index) => ({
    ...pattern, restMin: longIndices.has(index) ? longRecovery : shortMin,
    restMax: longIndices.has(index) ? longRecovery : shortMax,
  }));

  const markers = new Map<number, number>();
  for (const marker of track.markers) {
    if (marker.timeMs <= 0 || marker.timeMs >= end) continue;
    const score = marker.kind === "section" ? 4 : 1 + (marker.strength ?? 0);
    markers.set(marker.timeMs, Math.max(score, markers.get(marker.timeMs) ?? 0));
  }
  const minimum = (slot: Slot) => slot.minimum + slot.restMin;
  const maximum = (slot: Slot) => slot.maximum + slot.restMax;
  let remainingMin = slots.reduce((sum, slot) => sum + minimum(slot), 0);
  let remainingMax = slots.reduce((sum, slot) => sum + maximum(slot), 0);
  // When a long pattern leaves very little scheduling flexibility, preserve the recovery
  // windows and let the work budget stretch by the remaining amount.
  slots.at(-1)!.maximum += Math.max(0, end - remainingMax);
  remainingMax = Math.max(remainingMax, end);
  const opening = [...markers].filter(([time, score]) => time <= Math.min(2000, end - remainingMin) && score >= 1.65);
  opening.sort(([a, aScore], [b, bScore]) => bScore - aScore || a - b);
  let start = opening[0]?.[0] ?? 0;
  const cues: Cue[] = [];
  for (const [index, slot] of slots.entries()) {
    remainingMin -= minimum(slot);
    remainingMax -= maximum(slot);
    const firstNext = end - remainingMax;
    const lastNext = end - remainingMin;
    const low = Math.max(start + slot.minimum, firstNext - slot.restMax);
    const high = Math.min(start + slot.maximum, lastNext - slot.restMin);
    const eligible = new Map([...markers].filter(([time]) => time >= low && time <= high + slot.restMax));
    let transition: { recovery: number; next: number };
    if (index === slots.length - 1) {
      transition = pairTransition(eligible, low, high, 0, 0, end - (slot.restMin + slot.restMax) / 2);
      transition.next = end;
    } else {
      // Candidate starts and ends must keep enough room for every later drill and rest.
      transition = pairTransition(eligible, low, high, slot.restMin, slot.restMax,
        start + Math.round((end - start) / (slots.length - index)) - (slot.restMin + slot.restMax) / 2,
        firstNext, lastNext);
    }
    cues.push({ timeMs: start, command: "INLINE", drill: slot.drill,
      note: index === 0 ? "Opening practice" : "Practice block " + (index + 1) });
    cues.push({ timeMs: transition.recovery, command: "IDLE",
      note: (index === slots.length - 1 ? "Final recovery" : "Recovery") + " · " + (transition.next - transition.recovery) / 1000 + " s" });
    start = transition.next;
  }
  cues.push({ timeMs: end, command: "STOP", note: "End of track" });
  return { cues, unused, longCount };
}
