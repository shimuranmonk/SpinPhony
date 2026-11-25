import { drillParameters } from "./generator.js";
import type { Cue, Profile } from "./generator.js";
import { initialBall, maxBalls } from "./manualScore.js";
import type { Block } from "./manualScore.js";

export function autoCuesToBlocks(cues: Cue[], profile: Profile, bpm: number): Block[] {
  const direction = profile.handedness === "left" ? -1 : 1;
  return cues.map((cue, index) => {
    const inline = cue.command === "INLINE";
    const balls = inline ? drillParameters(cue.drill, bpm).map(ball => ({ ...ball, DROP: ball.DROP * direction })) : [{ ...initialBall }];
    if (balls.length > maxBalls) throw new Error("A generated drill exceeds the editor’s 10-ball limit.");
    return {
      id: index + 1, timeMs: cue.timeMs, kind: inline ? "CDRILL" : cue.command,
      note: cue.note ?? "", name: inline ? cue.drill.name : "",
      balls, random: inline && cue.drill.random, once: inline && Boolean(cue.once),
      seconds: cue.command === "IDLE" ? Math.min(600, (cues[index + 1].timeMs - cue.timeMs) / 1000) : 0,
      flavor: { SPEED: 3.5, BPM: 65, SPIN: 2.5, HEIGHT: 38 },
    };
  });
}
