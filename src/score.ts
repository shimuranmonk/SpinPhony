import type { Drill } from "./catalog.js";
import { cycleDuration, timestamp, validateTrack } from "./generator.js";
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

const longSectionMs = 45000;
const workBlockMs = 20000;
const recoveryMs = 8000;
const finalRecoveryMs = 5000;

function scheduleLongSection(
  assignments: Map<number, string>, start: number, end: number, drill: Drill, cycleMs: number,
  opening: boolean, closing: boolean,
) {
  // These budgets are provisional. Round up before adding cues so the millisecond grid
  // never squeezes a planned cycle into a slot shorter than its feed time.
  const slotMs = Math.ceil(cycleMs) + 1;
  const closingCycles = closing ? Math.min(3, Math.floor(workBlockMs / slotMs)) : 0;
  const closingStart = end - (closing ? closingCycles * slotMs + finalRecoveryMs : 0);
  const workEnd = closingStart - recoveryMs;
  let cursor = start;

  function work(count: number, label: string) {
    assignments.set(cursor, drill.name + " x" + count + " | Auto · " + label);
    cursor += count * slotMs;
    // An empty section ends the repeat window. Finite ONCE cues leave this gap without a robot command.
    assignments.set(cursor, "- | Auto · Recovery, no feeds scheduled");
    cursor += recoveryMs;
  }

  if (opening) work(Math.min(3, Math.floor(workBlockMs / slotMs)), "Opening practice");
  while (cursor + slotMs <= workEnd) {
    const count = Math.floor(Math.min(workBlockMs, workEnd - cursor) / slotMs);
    work(count, "Practice block");
  }
  if (closingCycles > 0) {
    assignments.set(closingStart, drill.name + " x" + closingCycles + " | Auto · Closing practice");
    assignments.set(end - finalRecoveryMs, "- | Auto · Final recovery, no feeds scheduled");
  }
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
    const fits = ranked.filter(drill => cycleDuration(drill, bpm) + 2002 <= span);
    const baseline = fits[0];
    if (!baseline) {
      assignments.set(section.timeMs, "- | " + label + " · No complete cycle and gap fit");
      return;
    }
    // A louder passage can change the pattern within the same movement, order and cycle-size checks.
    const alternate = fits.find(drill => movement(drill) === movement(baseline)
      && drill.random === baseline.random && drill.balls.length === baseline.balls.length
      && drill.balls.some((ball, i) => ball.drop !== baseline.balls[i].drop || ball.spin !== baseline.balls[i].spin));
    const drill = repeated && fits.includes(repeated.drill) ? repeated.drill
      : !bookend && acoustic && acoustic.level > peakLevel * .75 ? alternate ?? baseline : baseline;
    if (!bookend && acoustic && !repeated) patterns.push({ profile: acoustic, drill });
    const cycleMs = cycleDuration(drill, bpm);
    if (span >= longSectionMs && Math.ceil(cycleMs) + 1 <= workBlockMs) {
      scheduleLongSection(assignments, section.timeMs, end, drill, cycleMs,
        index === 0, index === sections.length - 1);
      return;
    }
    // Equal slots leave at least two seconds without a planned delivery between finite cycles.
    const cap = Math.floor(span / (cycleMs + 2002));
    const target = bookend ? 3 : 6;
    const count = Math.min(target, cap);
    const decision = repeated?.drill === drill ? "Similar passage, same drill"
      : index === 0 ? "Gentle opening" : bookend ? "Closing practice" : "Section practice";
    assignments.set(section.timeMs, drill.name + " x" + count + " | " + label + " · " + decision);
  });

  const lines = [
    ...Array.from(assignments, ([timeMs, assignment]) => ({ timeMs, text: "SECTION | " + assignment })),
    ...markers.filter(marker => marker.kind === "hit").map(marker => ({ timeMs: marker.timeMs, text: "HIT | -" })),
  ].sort((a, b) => a.timeMs - b.timeMs).map(line => timestamp(line.timeMs) + " | " + line.text);
  return [...lines, timestamp(track.durationMs) + " | STOP"].join("\n");
}

export function readTimeline(text: string, durationMs: number, drills: Drill[], bpm: number) {
  // Auto still uses this compact text format internally. The block editor has its own compiler.
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
  // Section assignments own their whole span, including hits that land exactly at the start.
  const covered: { start: number; end: number }[] = [];
  sections.forEach((section, index) => {
    if (!section.drill) return;
    const end = sections[index + 1]?.timeMs ?? durationMs;
    const slot = (end - section.timeMs) / section.count;
    if (!Number.isFinite(slot) || slot < cycleDuration(section.drill, bpm)) {
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
  cues.sort((a, b) => a.timeMs - b.timeMs);
  for (const [index, cue] of cues.entries()) {
    if (cue.command !== "INLINE" || !cue.drill.parameters) continue;
    const next = cues[index + 1];
    if (next && next.timeMs - cue.timeMs + 1 < cycleDuration(cue.drill, bpm)) {
      throw new Error("The drill at " + timestamp(cue.timeMs) + " does not fit before the next cue. Adjust its ball settings or regenerate.");
    }
  }
  return { lines, cues };
}
