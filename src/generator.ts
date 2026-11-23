import type { Drill } from "./catalog.js";
import type { Track } from "./rhythm.js";

export type Profile = {
  pace: "steady" | "active";
  handedness: "right" | "left";
};

export type Cue = { note?: string } & (
  | { timeMs: number; command: "INLINE"; drill: Drill; once?: boolean }
  | { timeMs: number; command: "IDLE" | "STOP" });

export function timestamp(ms: number): string {
  return [
    String(Math.floor(ms / 60000)).padStart(2, "0"),
    String(Math.floor(ms / 1000) % 60).padStart(2, "0"),
  ].join(":") + "." + String(ms % 1000).padStart(3, "0");
}

export function validateTrack(track: Track) {
  const { durationMs, filename, sha256 } = track;
  if (filename !== filename.trim() || filename.length > 255
    || /[<>:"|?*\\/\u0000-\u001f]/u.test(filename) || !/^.+\.[^.]+$/u.test(filename)
    || !/^[a-f0-9]{64}$/.test(sha256)
    || !Number.isInteger(durationMs) || durationMs < 8000 || durationMs > 360000) {
    throw new Error("The track needs a plain filename with an extension and valid audio metadata.");
  }
}

export const tagline = "Soundtrack of a Loop";

export function msyncHeader(track: Track, mode: "Auto Generate" | "Complete Customization") {
  const title = track.filename.replace(/\.[^.]+$/, "");
  return [
    "# " + title + " - SpinPhony MSYNC v1",
    "# " + tagline,
    "# Source audio: " + track.filename,
    "# Duration: " + timestamp(track.durationMs),
    "# Created in " + mode,
  ].join("\n");
}

export function feedRate(track: Track, profile: Profile) {
  const cap = profile.pace === "steady" ? 60 : 90;
  const tempo = track.rhythm?.bpm ?? cap;
  return Math.max(30, Math.round(tempo / Math.ceil(tempo / cap)));
}

export function exportTimeline(track: Track, cues: Cue[], profile: Profile, bpm: number) {
  validateTrack(track);
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
    "# Drill: " + drill.name + " — " + drill.description,
    "NAME=" + drill.name,
    "RANDOM=" + drill.random,
    ...drill.balls.map((ball, index) => {
      const speed = ball.depth === "short" ? 3 : 5;
      return "BALL=" + (index + 1) + ";SPEED=" + speed + ";SPIN=2;TYPE=" + ball.spin
        + ";HEIGHT=20;DROP=" + (ball.drop * direction) + ";BPM=" + bpm + ";REPS=1";
    }),
  ].join("\n"));
  const lines = cues.flatMap(cue => {
    const label = cue.command === "INLINE" ? cue.drill.name
      : cue.command === "IDLE" ? "Recovery" : "End of track";
    const note = cue.note?.replace(/[\u0000-\u001f\u007f\u2028\u2029]+/gu, " ").trim();
    const command = cue.command === "INLINE" ? "INLINE=" + cue.drill.id + (cue.once ? ";ONCE" : "") : cue.command;
    return ["# " + label + (note ? " — " + note : ""), timestamp(cue.timeMs) + " " + command];
  });
  const source = [
    msyncHeader(track, "Auto Generate") + "\n\nMSYNC_VERSION=1",
    ["[AUDIO]", "FILENAME=" + filename, "SHA256=" + sha256, "DURATION=" + timestamp(durationMs)].join("\n"),
    ...blocks,
    ["[CUES]", ...lines].join("\n"),
  ].join("\n\n") + "\n";
  return source;
}
