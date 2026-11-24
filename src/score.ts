import type { Drill } from "./catalog.js";
import { timestamp, validateTrack } from "./generator.js";
import type { Cue } from "./generator.js";
import type { Track } from "./rhythm.js";
import type { SectionProfile } from "./music.js";

type TimelineLine = {
  timeMs: number;
  kind: "HIT" | "SECTION" | "STOP";
  line: number;
  drill?: Drill;
  count: number;
  note: string;
};

function movement(drill: Drill) {
  const drops = drill.balls.map(ball => ball.drop);
  return Math.max(...drops) - Math.min(...drops);
}

function similar(a: SectionProfile, b: SectionProfile, peakLevel: number, peakBrightness: number) {
  return Math.abs(a.hitsPerSecond - b.hitsPerSecond) <= .45
    && Math.hypot((a.level - b.level) / Math.max(.001, peakLevel),
      (a.brightness - b.brightness) / Math.max(.001, peakBrightness)) <= .15;
}

export function suggestTimeline(track: Track, drills: Drill[], bpm: number): string {
  validateTrack(track);
  if (!drills.length) throw new Error("Select at least one drill.");
  const markers = track.markers.filter(marker => marker.timeMs < track.durationMs);
  const sections = markers.filter(marker => marker.kind === "section");
  const ranked = drills.filter(drill => drill.balls.length)
    .sort((a, b) => movement(a) - movement(b) || Number(a.random) - Number(b.random) || a.balls.length - b.balls.length);
  const peakLevel = Math.max(0, ...sections.map(section => section.profile?.level ?? 0));
  const peakBrightness = Math.max(0, ...sections.map(section => section.profile?.brightness ?? 0));
  const patterns: { profile: SectionProfile; drill: Drill }[] = [];
  const assignments = new Map<number, string>();

  sections.forEach((section, index) => {
    const end = sections[index + 1]?.timeMs ?? track.durationMs;
    const span = end - section.timeMs;
    const label = "Section " + (index + 1);
    const acoustic = section.profile;
    if (acoustic && acoustic.level <= Math.max(.002, peakLevel * .25) && acoustic.hitsPerSecond < .6) {
      assignments.set(section.timeMs, "- | " + label + " · Quiet passage, no feeds scheduled");
      return;
    }
    const bookend = index === 0 || index === sections.length - 1;
    const repeated = !bookend && acoustic
      ? patterns.find(pattern => similar(pattern.profile, acoustic, peakLevel, peakBrightness)) : undefined;
    const fits = ranked.filter(drill => drill.balls.length * 60000 / bpm + 2002 <= span);
    const alternate = fits.find(drill => movement(drill) === movement(fits[0])
      && drill.random === fits[0].random && drill.balls.length === fits[0].balls.length
      && drill.balls.some((ball, i) => ball.drop !== fits[0].balls[i].drop || ball.spin !== fits[0].balls[i].spin));
    const drill = repeated && fits.includes(repeated.drill) ? repeated.drill
      : !bookend && acoustic && acoustic.level > peakLevel * .75 ? alternate ?? fits[0] : fits[0];
    if (!drill) {
      assignments.set(section.timeMs, "- | " + label + " · No complete cycle and gap fit");
      return;
    }
    if (!bookend && acoustic && !repeated) patterns.push({ profile: acoustic, drill });
    const cycleMs = drill.balls.length * 60000 / bpm;
    // Equal slots leave at least two seconds without a planned delivery between finite cycles.
    const cap = Math.floor(span / (cycleMs + 2002));
    const target = bookend ? 3 : 6;
    const count = Math.min(target, cap);
    const decision = repeated?.drill === drill ? "Similar passage, same drill"
      : index === 0 ? "Gentle opening" : bookend ? "Closing practice" : "Section practice";
    assignments.set(section.timeMs, drill.name + " x" + count + " | " + label + " · " + decision);
  });

  const lines = markers.map(marker => timestamp(marker.timeMs) + " | "
    + (marker.kind === "section" ? "SECTION | " + assignments.get(marker.timeMs) : "HIT | -"));
  return [...lines, timestamp(track.durationMs) + " | STOP"].join("\n");
}

export function readTimeline(text: string, durationMs: number, drills: Drill[], bpm: number) {
  const byName = new Map(drills.map(drill => [drill.name.toLowerCase(), drill]));
  const lines: TimelineLine[] = [];
  for (const [line, raw] of text.split(/\r?\n/).entries()) {
    if (!raw.trim() || raw.trimStart().startsWith("#")) continue;
    const [time, kind, assignment = "-", ...notes] = raw.split("|").map(part => part.trim());
    const match = /^(\d{2,}):([0-5]\d)\.(\d{3})$/.exec(time);
    const timeMs = match ? (Number(match[1]) * 60 + Number(match[2])) * 1000 + Number(match[3]) : NaN;
    const fail = (message: string): never => { throw new Error("Line " + (line + 1) + ". " + message); };
    if (!Number.isSafeInteger(timeMs) || timeMs > durationMs || timeMs < (lines.at(-1)?.timeMs ?? 0)) {
      fail("Enter times in MM:SS.mmm order within the audio duration.");
    }
    if (kind !== "HIT" && kind !== "SECTION" && kind !== "STOP") {
      throw new Error("Line " + (line + 1) + ". Use HIT, SECTION, or STOP.");
    }
    if (kind === "STOP" ? timeMs !== durationMs || assignment !== "-" : timeMs === durationMs) {
      fail("Only an unassigned STOP belongs at the end of the audio.");
    }
    if (lines.at(-1)?.kind === "STOP") fail("STOP must be the final marker.");
    if (kind === "SECTION" && lines.some(item => item.kind === "SECTION" && item.timeMs === timeMs)) {
      fail("Section boundaries must have distinct times.");
    }
    const repeat = /^(.*?)\s+x(\d+)$/i.exec(assignment);
    const count = repeat ? Number(repeat[2]) : 1;
    if (repeat && (kind !== "SECTION" || count < 1 || count > 50)) {
      fail("Use x1 through x50 on a SECTION drill assignment.");
    }
    const drill = assignment === "-" ? undefined : byName.get((repeat?.[1] ?? assignment).toLowerCase());
    if (assignment !== "-" && !drill) fail("Use a selected drill's name or - to leave this marker unassigned.");
    lines.push({ timeMs, kind, line, drill, count, note: notes.join(" | ") });
  }
  if (lines.at(-1)?.kind !== "STOP") throw new Error("Add a final STOP at " + timestamp(durationMs) + ".");

  const sections = lines.filter(line => line.kind === "SECTION");
  const cues: Cue[] = [];
  const covered: { start: number; end: number }[] = [];
  sections.forEach((section, index) => {
    if (!section.drill) return;
    const end = sections[index + 1]?.timeMs ?? durationMs;
    const slot = (end - section.timeMs) / section.count;
    if (slot < section.drill.balls.length * 60000 / bpm) {
      throw new Error("Line " + (section.line + 1) + ". This drill and repeat count do not fit before the next section.");
    }
    covered.push({ start: section.timeMs, end });
    for (let i = 0; i < section.count; i++) {
      const repeat = "Repeat " + (i + 1) + " of " + section.count;
      cues.push({
        timeMs: Math.round(section.timeMs + slot * i), command: "INLINE", drill: section.drill,
        once: true, note: [section.note, repeat].filter(Boolean).join(" · "),
      });
    }
  });
  for (const line of lines) {
    if (line.kind === "STOP") cues.push({ timeMs: line.timeMs, command: "STOP", note: line.note });
    if (line.kind === "HIT" && line.drill && !covered.some(range => line.timeMs >= range.start && line.timeMs < range.end)) {
      if (cues.some(cue => cue.timeMs === line.timeMs)) {
        throw new Error("Line " + (line.line + 1) + ". Assign only one action at this time.");
      }
      cues.push({ timeMs: line.timeMs, command: "INLINE", drill: line.drill, once: true, note: line.note });
    }
  }
  return { lines, cues: cues.sort((a, b) => a.timeMs - b.timeMs) };
}
