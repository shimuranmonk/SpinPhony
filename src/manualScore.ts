import { msyncHeader, timestamp, validateTrack } from "./generator.js";
import { nativeDrills } from "./nativeDrills.js";
import { SPIN_LIMITS } from "./msync-v1/limits.js";
import type { Track } from "./rhythm.js";

export const ballFields = {
  SPEED: [0, 10, .5], SPIN: [0, 10, .5], HEIGHT: [-50, 100, 1],
  DROP: [-10, 10, .5], BPM: [30, 90, 1], REPS: [1, 200, 1],
} as const;
export type BallField = keyof typeof ballFields;
export type Ball = Record<BallField, number> & { TYPE: "top" | "back" };
export const flavorFields = ["SPEED", "BPM", "SPIN", "HEIGHT"] as const;
export const blockKinds = ["CDRILL", "FLAVOR", "IDLE", "STOP", "FLAG"] as const;
export const maxBalls = 10;
export type BlockKind = typeof blockKinds[number];
export type Block = {
  id: number; timeMs: number; kind: BlockKind; note: string; name: string; inheritedName?: string;
  balls: Ball[]; random: boolean; once: boolean; seconds: number;
  flavor: Pick<Ball, typeof flavorFields[number]>;
};
export const initialBall: Ball = {
  SPEED: 3, SPIN: 2, TYPE: "top", HEIGHT: 20, DROP: 0, BPM: 35, REPS: 1,
};

export function loadBuiltInBalls(balls: Ball[], start: number, key: string, level: number): Ball[] {
  const source = nativeDrills.find(drill => drill.key === key)?.levels[level - 1];
  if (!source?.length || start < 0 || start >= balls.length || !Number.isInteger(start)) {
    throw new Error("Choose a built-in drill and level for this ball.");
  }
  if (start + source.length > maxBalls) throw new Error("This drill would exceed the 10-ball limit.");
  const loaded = source.map(ball => ({
    SPEED: ball.speed, SPIN: ball.spin, TYPE: ball.type === "back" ? "back" as const : "top" as const,
    HEIGHT: ball.height, DROP: ball.drop, BPM: ball.bpm, REPS: ball.repetitions,
  }));
  return [...balls.slice(0, start), ...loaded, ...balls.slice(start + loaded.length)];
}

export const blockOrder: Record<BlockKind, number> = { CDRILL: 0, FLAVOR: 1, IDLE: 2, STOP: 3, FLAG: 4 };
const clean = (text: string) => text.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/gu, " ").trim();
const alias = (name: string, prefix: string) => name.trim().toUpperCase().replace(new RegExp("^" + prefix + "_"), "");
const validAlias = /^[A-Z][A-Z0-9_]{0,35}$/;
const spinLimits: Readonly<Partial<Record<string, number>>> = SPIN_LIMITS;

export function maxSpinAt(speed: number) {
  return spinLimits[String(speed)];
}

export function fitBallSpeedSpin(ball: Ball): Ball {
  // Keep an empty field editable. Apply the envelope as soon as both values are known.
  const halfStep = (value: number, max: number) => Math.round(Math.min(max, Math.max(0, value)) * 2) / 2;
  const SPEED = Number.isFinite(ball.SPEED) ? halfStep(ball.SPEED, ballFields.SPEED[1]) : ball.SPEED;
  const maxSpin = maxSpinAt(SPEED) ?? ballFields.SPIN[1];
  const SPIN = Number.isFinite(ball.SPIN) ? halfStep(ball.SPIN, maxSpin) : ball.SPIN;
  return { ...ball, SPEED, SPIN };
}
const fields = ["SPEED", "SPIN", "TYPE", "HEIGHT", "DROP", "BPM", "REPS"] as const;

export function blockLabel(block: Block) {
  const detail = block.kind === "IDLE" ? (Number.isFinite(block.seconds) ? block.seconds + "s" : "")
    : block.kind === "STOP" ? "" : block.kind === "CDRILL" ? drillName(block) : block.name.trim();
  return detail ? block.kind + " - " + detail : block.kind;
}

export function drillName(block: Block) {
  return clean(block.name) || block.inheritedName || "Custom drill";
}

export function checkField(key: BallField, value: number) {
  const [min, max, step] = ballFields[key];
  if (!Number.isFinite(value) || value < min || value > max || !Number.isInteger((value - min) / step)) {
    throw new Error(key + " must be between " + min + " and " + max + " in steps of " + step + ".");
  }
}
function checkSpin(speed: number, spin: number) {
  if (spin > (maxSpinAt(speed) ?? -1)) throw new Error("Spin exceeds the limit for this speed.");
}

export const sessionFields = {
  COUNTDOWN: { label: "Countdown", max: 10, step: 1 },
  CYCLE_PAUSE: { label: "Cycle pause", max: 10, step: .001 },
  ROBOT_LEAD: { label: "Robot lead", max: 5, step: .001 },
} as const;
export type SessionField = keyof typeof sessionFields;
export type SessionSettings = Record<SessionField, string>;
export const defaultSession: SessionSettings = { COUNTDOWN: "4", CYCLE_PAUSE: "1", ROBOT_LEAD: "0" };

export function compileManualScore(track: Track, blocks: Block[], session = defaultSession) {
  validateTrack(track);
  const definitions = new Map<string, string>();
  const inlineNames = new Map<string, string>();
  const inlineDrills: { alias: string; title: string; block: Block }[] = [];
  const acceptedBlocks: Block[] = [];
  const cues: string[] = [];
  const issues: string[] = [];
  const sessionLines = (Object.keys(sessionFields) as SessionField[]).map(key => {
    const { label, max, step } = sessionFields[key];
    const value = session[key].trim();
    const format = step === 1 ? /^\d+$/ : /^\d+(?:\.\d{1,3})?$/;
    if (!format.test(value) || Number(value) > max) {
      issues.push(label + " must be between 0 and " + max
        + (step === 1 ? " as a whole number." : " with up to three decimal places."));
      return key + "=";
    }
    return key + "=" + Number(value);
  });
  // Flags are bookmarks. Keep them out of timing checks as well as out of the file.
  const sorted = blocks.filter(block => block.kind !== "FLAG")
    .sort((a, b) => a.timeMs - b.timeMs || blockOrder[a.kind] - blockOrder[b.kind]);
  let previous: Block | undefined;
  let pausedUntil = 0;
  let active: Block | undefined;
  let stopped = false;
  let activated = false;

  function define(key: string, value: string) {
    if (definitions.has(key) && definitions.get(key) !== value) throw new Error("This alias already has different settings.");
    definitions.set(key, value);
  }

  for (const block of sorted) {
    const { kind, timeMs, seconds, id } = block;
    const time = Number.isInteger(timeMs) && timeMs >= 0 ? timestamp(timeMs) : "Invalid time";
    const label = clean(blockLabel(block));
    if (kind === "CDRILL" && cues.length) cues.push("");
    cues.push("# " + label + (block.note.trim() ? " — " + clean(block.note) : ""));
    try {
      if (!Number.isInteger(timeMs) || timeMs < 0 || timeMs > track.durationMs || (timeMs === track.durationMs && kind !== "STOP")) {
        throw new Error("Choose a cue time within the track.");
      }
      if (stopped) throw new Error("This block comes after STOP.");
      if (previous?.timeMs === timeMs && (blockOrder[kind] === blockOrder[previous.kind] || kind === "STOP" || kind === "IDLE")) {
        throw new Error("These blocks cannot share a timestamp.");
      }
      if (timeMs < pausedUntil && kind !== "STOP") throw new Error("This block overlaps the reserved IDLE interval.");
      let command: string = kind;
      if (kind === "CDRILL") {
        const title = drillName(block);
        if (!title || !block.balls.length || block.balls.length > maxBalls) throw new Error("Enter a name and 1–10 ball entries.");
        const balls = block.balls.map((ball, index) => {
          for (const key of fields) {
            if (key !== "TYPE") checkField(key, ball[key]);
          }
          if (ball.TYPE !== "top" && ball.TYPE !== "back") throw new Error("Choose top or back for TYPE.");
          checkSpin(ball.SPEED, ball.SPIN);
          return "BALL=" + (index + 1) + fields.map(key => ";" + key + "=" + ball[key]).join("");
        });
        // Compare the serialized settings. Times, notes and ONCE belong to each cue.
        const body = ["NAME=" + title, "RANDOM=" + block.random, ...balls].join("\n");
        let name = inlineNames.get(body);
        if (!name) {
          const suffix = title.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 25);
          name = "INL_" + (/^[A-Z]/.test(suffix) ? suffix : "DRILL_" + suffix) + "_" + id;
          define(name, ["# Drill: " + title, "[INLINE:" + name + "]", body].join("\n"));
          inlineNames.set(body, name);
          inlineDrills.push({ alias: name, title, block });
        }
        command = "INLINE=" + name + (block.once ? ";ONCE" : "");
        active = block;
        activated = true;
      } else if (kind === "STOP") {
        stopped = true;
      } else {
        // The v1 validator only treats ONCE as active at its own timestamp.
        if (!active || active.once && active.timeMs !== timeMs) throw new Error("Place this on or after an active drill.");
        if (kind === "FLAVOR") {
          const name = "FLV_" + alias(block.name, "FLV").replace(/\s+/g, "_");
          if (!validAlias.test(name.slice(4)) || name === "FLV_NONE") throw new Error("Enter a flavor alias starting with a letter, up to 36 letters, numbers or underscores. NONE is reserved.");
          for (const key of flavorFields) checkField(key, block.flavor[key]);
          checkSpin(block.flavor.SPEED, block.flavor.SPIN);
          define(name, ["[FLAVOR:" + name + "]", ...flavorFields.map(key => "FLV_" + key + "=" + block.flavor[key])].join("\n"));
          command = "FLAVOR=" + name;
        } else {
          const milliseconds = Math.round(seconds * 1000);
          if (!Number.isFinite(seconds) || seconds < .001 || seconds > 600
            || Math.abs(seconds * 1000 - milliseconds) > 1e-7 || timeMs + milliseconds > track.durationMs) {
            throw new Error("Enter a positive duration within the remaining track, with up to three decimals.");
          }
          // IDLE has no duration in the file. This reservation keeps the editor from placing an early restart.
          pausedUntil = timeMs + milliseconds;
          active = undefined;
        }
      }
      cues.push(time + " " + command);
      acceptedBlocks.push(block);
      previous = block;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      issues.push(time + " " + label + ". " + message);
      // Keep the rejected block visible in the draft without emitting an invalid command.
      cues.push("# " + time + " · " + message);
    }
  }
  if (!activated) issues.push("Add a valid CDRILL to enable MSYNC export.");
  if (!stopped) issues.push("Add a STOP block where the session should end.");
  const source = [msyncHeader(track, "MSYNC Editor") + "\n\nMSYNC_VERSION=1",
    ["[SESSION]", ...sessionLines].join("\n"),
    ["[AUDIO]", "FILENAME=" + track.filename, "SHA256=" + track.sha256, "DURATION=" + timestamp(track.durationMs)].join("\n"),
    ...definitions.values(), ["[CUES]", ...cues].join("\n")].join("\n\n") + "\n";
  return { source, issues, inlineDrills, acceptedBlocks };
}
