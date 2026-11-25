import type { Drill } from "./catalog.js";
import type { Profile } from "./generator.js";
import { ballFields, checkField, loadBuiltInBalls, initialBall, maxSpinAt } from "./manualScore.js";
import type { Ball, BallField } from "./manualScore.js";
import { nativeDrills } from "./nativeDrills.js";

export const skillLimits = {
  Novice: { speed: 3, spin: 3, adjustment: 0 },
  Amateur: { speed: 4.5, spin: 4, adjustment: .5 },
  Expert: { speed: 6, spin: 6, adjustment: 1 },
  Pro: { speed: 8, spin: 8, adjustment: 1.5 },
} as const;
export type Skill = keyof typeof skillLimits;

export function pattern(parameters: Ball[]): Drill["balls"] {
  return parameters.map(ball => ({ drop: ball.DROP, spin: ball.TYPE, depth: "long" }));
}

export const novaPatterns: Drill[] = nativeDrills.map(native => {
  const parameters = loadBuiltInBalls([initialBall], 0, native.key, 1);
  return {
    id: "INL_NOVA_" + native.key.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/_+$/, "").slice(0, 26),
    name: native.key === "drive(f)" ? "Forehand Drive" : native.name,
    category: "Nova Drills", source: "", random: native.random, parameters,
    description: "Nova Level 1 · " + parameters.length + (parameters.length === 1 ? " ball" : " balls"),
    balls: pattern(parameters),
  };
});

export function prepareAutoDrill(drill: Drill, profile: Profile): Drill {
  const limit = skillLimits[profile.skill ?? "Novice"];
  const adjustment = drill.category === "Nova Drills" ? limit.adjustment : 0;
  const parameters = drill.parameters?.map(ball => {
    const SPEED = Math.min(ball.SPEED + adjustment, limit.speed);
    return { ...ball, SPEED, SPIN: Math.min(ball.SPIN + adjustment, limit.spin, maxSpinAt(SPEED) ?? 0),
      BPM: Math.min(90, ball.BPM + (drill.category === "Nova Drills" && profile.pace === "active" ? 6 : 0)) };
  });
  return parameters ? { ...drill, parameters, balls: pattern(parameters) } : drill;
}

export function validateAutoBalls(balls: Ball[], skill?: Skill) {
  if (!balls.length || balls.length > 10) throw new Error("A drill must contain 1–10 balls.");
  balls.forEach((ball, index) => {
    try {
      for (const key of Object.keys(ballFields) as BallField[]) checkField(key, ball[key]);
      if (ball.TYPE !== "top" && ball.TYPE !== "back") throw new Error("TYPE must be top or back.");
      if (ball.SPIN > (maxSpinAt(ball.SPEED) ?? -1)) throw new Error("Spin exceeds the robot limit at this speed.");
      if (skill && (ball.SPEED > skillLimits[skill].speed || ball.SPIN > skillLimits[skill].spin)) {
        throw new Error("Speed or Spin exceeds the " + skill + " limit.");
      }
    } catch (error) {
      throw new Error("Ball " + (index + 1) + ": " + (error instanceof Error ? error.message : String(error)));
    }
  });
}

const customKey = "spinphony-custom-drills-v1";
export function readCustomDrills(): Drill[] {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(customKey) ?? "[]");
    if (!Array.isArray(saved)) return [];
    return saved.flatMap(item => {
      try {
        if (!item || !/^INL_CUSTOM_[A-F0-9]{24}$/.test(item.id) || typeof item.name !== "string"
          || !item.name.trim() || /[|\r\n]/.test(item.name) || typeof item.random !== "boolean"
          || !Array.isArray(item.parameters)) return [];
        validateAutoBalls(item.parameters);
        return [{ ...item, category: "Custom", source: "", description: "Saved custom drill", balls: pattern(item.parameters) }];
      } catch { return []; }
    });
  } catch { return []; }
}

export function saveCustomDrill(saved: Drill[], name: string, settings: Ball[], random: boolean): Drill[] {
  validateAutoBalls(settings);
  const title = name.trim();
  if (!title || /[|\u0000-\u001f\u007f]|\s+x\d+$/i.test(title)) throw new Error("Enter a drill name without a pipe, control characters or repeat suffix.");
  if ([...novaPatterns, ...saved].some(drill => drill.name.toLowerCase() === title.toLowerCase())) {
    throw new Error("That drill name is already in use. Enter a different name.");
  }
  const id = "INL_CUSTOM_" + crypto.randomUUID().replaceAll("-", "").slice(0, 24).toUpperCase();
  const next: Drill[] = [...saved, { id, name: title, category: "Custom", description: "Saved custom drill",
    source: "", balls: pattern(settings), parameters: settings, random }];
  localStorage.setItem(customKey, JSON.stringify(next));
  return next;
}
