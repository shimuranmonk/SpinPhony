import type { Drill } from "./catalog.js";
import { timestamp, validateTrack } from "./generator.js";
import type { Track } from "./rhythm.js";

export const ballFields = {
  SPEED: [0, 10, .5], SPIN: [0, 10, .5], HEIGHT: [-50, 100, 1],
  DROP: [-10, 10, .5], BPM: [30, 90, 1], REPS: [1, 200, 1],
  SCATTER: [0, 10, .5],
} as const;
export type BallField = keyof typeof ballFields;
export type Ball = Record<BallField, number> & { TYPE: "top" | "back" };
export const blockKinds = ["Drill", "Custom Drill", "Flavor", "Rest", "Idle", "Stop"] as const;
export type BlockKind = typeof blockKinds[number];
export type Block = {
  id: number; timeMs: number; kind: BlockKind; note: string; name: string;
  balls: Ball[]; random: boolean; once: boolean; seconds: number;
  flavorField: Exclude<BallField, "SCATTER"> | "TYPE"; flavorValue: number | "top" | "back";
};

export const initialBall: Ball = {
  SPEED: 3, SPIN: 2, TYPE: "top", HEIGHT: 20, DROP: 0, BPM: 35, REPS: 1, SCATTER: 0,
};

export function loadDrill(drill: Drill, left: boolean) {
  return {
    name: drill.name, random: drill.random,
    balls: drill.balls.map(ball => ({
      ...initialBall, SPEED: ball.depth === "short" ? 3 : 5, TYPE: ball.spin,
      DROP: ball.drop * (left ? -1 : 1),
    })),
  };
}

const spinLimits = [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 9, 8, 8, 7, 6, 5, 4, 3, 2, 1, 0];
const fields = Object.keys(ballFields) as BallField[];
const order: Record<BlockKind, number> = {
  Drill: 0, "Custom Drill": 0, Flavor: 1, Rest: 2, Idle: 3, Stop: 4,
};
const clean = (text: string) => text.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/gu, " ").trim();

function checkBall(ball: Ball) {
  for (const key of fields) {
    const [min, max, step] = ballFields[key];
    const value = ball[key];
    if (!Number.isFinite(value) || value < min || value > max || !Number.isInteger((value - min) / step)) {
      throw new Error(key + " must be between " + min + " and " + max + " in steps of " + step + ".");
    }
  }
  if (ball.SPIN > spinLimits[ball.SPEED * 2]) throw new Error("Spin exceeds the limit for this speed.");
  if (Math.abs(ball.DROP) + ball.SCATTER > 10) throw new Error("Placement plus scatter exceeds the lateral limit.");
  if (ball.TYPE !== "top" && ball.TYPE !== "back") throw new Error("Choose topspin or backspin.");
}

export function exportManualScore(track: Track, blocks: Block[]) {
  validateTrack(track);
  const definitions: string[] = [];
  const cues: string[] = [];
  const sorted = [...blocks].sort((a, b) => a.timeMs - b.timeMs || order[a.kind] - order[b.kind]);
  let previous = -1;
  const simultaneous = new Set<number>();
  let pausedUntil = 0;
  let active: Block | undefined;
  let stopped = false;
  let activated = false;
  for (const block of sorted) {
    const { kind, timeMs, seconds, id } = block;
    const prefix = timestamp(timeMs) + " " + kind + ". ";
    try {
      if (!Number.isInteger(timeMs) || timeMs < 0 || timeMs > track.durationMs || (timeMs === track.durationMs && kind !== "Stop")) {
        throw new Error("Choose a cue time within the track.");
      }
      if (stopped) throw new Error("This block comes after Stop.");
      if (timeMs !== previous) simultaneous.clear();
      if (simultaneous.has(order[kind]) || (kind === "Stop" || kind === "Idle") && simultaneous.size) {
        throw new Error("These blocks cannot share a timestamp.");
      }
      simultaneous.add(order[kind]);
      if (timeMs < pausedUntil && kind !== "Stop") throw new Error("This block overlaps a reserved pause.");
      let command: string = kind.toUpperCase();
      if (kind === "Drill" || kind === "Custom Drill") {
        if (!clean(block.name) || !block.balls.length) throw new Error("Choose a drill name and at least one ball.");
        const name = "INL_BLOCK_" + id;
        const balls = block.balls.map((ball, index) => {
          checkBall(ball);
          return "BALL=" + (index + 1) + ";TYPE=" + ball.TYPE + fields.map(key => ";" + key + "=" + ball[key]).join("");
        });
        definitions.push(["[INLINE:" + name + "]", "# Drill: " + clean(block.name), "NAME=" + clean(block.name),
          "RANDOM=" + block.random, ...balls].join("\n"));
        command = "INLINE=" + name + (block.once ? ";ONCE" : "");
        active = block;
        activated = true;
      } else if (kind === "Stop") {
        stopped = true;
      } else {
        if (!active || active.once && active.timeMs !== timeMs) {
          throw new Error("Place this on or after an active drill.");
        }
        if (kind === "Flavor") {
          const name = "FLV_BLOCK_" + id;
          for (const ball of active.balls) checkBall({ ...ball, [block.flavorField]: block.flavorValue });
          definitions.push("[FLAVOR:" + name + "]\nFLV_" + block.flavorField + "=" + block.flavorValue);
          command = "FLAVOR=" + name;
        } else {
          const milliseconds = Math.round(seconds * 1000);
          if (!Number.isFinite(seconds) || seconds < .001 || seconds > 600
            || Math.abs(seconds * 1000 - milliseconds) > 1e-7 || timeMs + milliseconds > track.durationMs) {
            throw new Error("Enter a positive duration within the remaining track, with up to three decimals.");
          }
          pausedUntil = timeMs + milliseconds;
          if (kind === "Rest") command = "REST=" + seconds;
          else active = undefined;
        }
      }
      cues.push("# " + kind + (block.note.trim() ? " — " + clean(block.note) : ""), timestamp(timeMs) + " " + command);
      previous = timeMs;
    } catch (error) {
      throw new Error(prefix + (error instanceof Error ? error.message : String(error)));
    }
  }
  if (!activated) throw new Error("Add a Drill or Custom Drill block to enable MSYNC export.");
  if (!stopped) throw new Error("Add a Stop block where the session should end.");
  return ["MSYNC_VERSION=1",
    ["[AUDIO]", "FILENAME=" + track.filename, "SHA256=" + track.sha256, "DURATION=" + timestamp(track.durationMs)].join("\n"),
    ...definitions, ["[CUES]", ...cues].join("\n")].join("\n\n") + "\n";
}
