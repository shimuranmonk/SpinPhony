import type { Drill } from "./catalog.js";
import type { Rhythm, Track } from "./rhythm.js";

export type Profile = {
  pace: "steady" | "active";
  handedness: "right" | "left";
  workBeats: number;
  recoveryBeats: number;
};

export type Cue =
  | { timeMs: number; command: "INLINE"; drill: Drill }
  | { timeMs: number; command: "IDLE" | "STOP" };

export function timestamp(ms: number): string {
  return [
    String(Math.floor(ms / 60000)).padStart(2, "0"),
    String(Math.floor(ms / 1000) % 60).padStart(2, "0"),
  ].join(":") + "." + String(ms % 1000).padStart(3, "0");
}

export function generate(track: Track, rhythm: Rhythm, selected: Drill[], profile: Profile) {
  const { durationMs, filename, sha256 } = track;
  if (filename !== filename.trim() || filename.length > 255
    || /[<>:"|?*\\/\u0000-\u001f]/u.test(filename) || !/^.+\.[^.]+$/u.test(filename)
    || !/^[a-f0-9]{64}$/.test(sha256)
    || !Number.isInteger(durationMs) || durationMs < 8000 || durationMs > 360000) {
    throw new Error("The track needs a plain filename with an extension and valid audio metadata.");
  }
  if (!Number.isFinite(rhythm.bpm) || rhythm.bpm < 40 || rhythm.bpm > 180
    || !Number.isInteger(rhythm.firstBeatMs) || rhythm.firstBeatMs < 0
    || rhythm.firstBeatMs > durationMs - 2000) {
    throw new Error("Enter a tempo from 40 to 180 BPM and a first beat at least two seconds before the end.");
  }
  if (!selected.length) throw new Error("Select at least one drill.");
  if (![8, 16, 32].includes(profile.workBeats) || ![0, 4, 8].includes(profile.recoveryBeats)) {
    throw new Error("Choose an available work and recovery length.");
  }

  const beatMs = 60000 / rhythm.bpm;
  const stride = profile.workBeats + profile.recoveryBeats;
  const maxFeed = profile.pace === "steady" ? 60 : 90;
  const bpm = Math.max(30, Math.round(rhythm.bpm / Math.ceil(rhythm.bpm / maxFeed)));
  const cues: Cue[] = [];
  for (let block = 0; ; block++) {
    const start = Math.round(rhythm.firstBeatMs + block * stride * beatMs);
    if (start > durationMs - 2000) break;
    const drill = selected[block % selected.length];
    cues.push({ timeMs: start, command: "INLINE", drill });
    const end = Math.round(rhythm.firstBeatMs + (block * stride + profile.workBeats) * beatMs);
    if (profile.recoveryBeats && end < durationMs) cues.push({ timeMs: end, command: "IDLE" });
  }
  cues.push({ timeMs: durationMs, command: "STOP" });

  return { cues, feedBpm: bpm };
}

export function exportTimeline(track: Track, cues: Cue[], profile: Profile, bpm: number) {
  const { filename, sha256, durationMs } = track;
  if (cues[0]?.command !== "INLINE" || cues.at(-1)?.command !== "STOP"
    || cues.at(-1)?.timeMs !== track.durationMs) {
    throw new Error("The timeline must start with a drill and stop at the end of the audio.");
  }
  const used = new Set<Drill>();
  let previous = -1;
  let active = false;
  for (const cue of cues) {
    if (!Number.isInteger(cue.timeMs) || cue.timeMs <= previous || cue.timeMs > track.durationMs) {
      throw new Error("Cue times must be whole milliseconds in increasing order.");
    }
    if (cue.command === "STOP" && cue.timeMs !== durationMs) {
      throw new Error("Stop must be the final cue.");
    }
    if (cue.command === "IDLE" && !active) {
      throw new Error("Recovery must follow a drill.");
    }
    previous = cue.timeMs;
    active = cue.command === "INLINE";
    if (cue.command === "INLINE") used.add(cue.drill);
  }
  const direction = profile.handedness === "right" ? 1 : -1;
  const blocks = Array.from(used, drill => [
    "[INLINE:" + drill.id + "]",
    "NAME=" + drill.name,
    "RANDOM=" + drill.random,
    ...drill.balls.map((ball, index) => {
      const speed = ball.depth === "short" ? 3 : 5;
      return "BALL=" + (index + 1) + ";SPEED=" + speed + ";SPIN=2;TYPE=" + ball.spin
        + ";HEIGHT=20;DROP=" + (ball.drop * direction) + ";BPM=" + bpm + ";REPS=1";
    }),
  ].join("\n"));
  const lines = cues.map(cue => timestamp(cue.timeMs) + " "
    + (cue.command === "INLINE" ? "INLINE=" + cue.drill.id : cue.command));
  const source = [
    "MSYNC_VERSION=1",
    ["[AUDIO]", "FILENAME=" + filename, "SHA256=" + sha256, "DURATION=" + timestamp(durationMs)].join("\n"),
    ...blocks,
    ["[CUES]", ...lines].join("\n"),
  ].join("\n\n") + "\n";
  return source;
}
