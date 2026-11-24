import type { Track } from "./rhythm.js";
import type { readTimeline } from "./score.js";

export type MusicEvent = {
  timeMs: number;
  title: string;
  detail: string;
  action: string;
};

export function describeMusicEvents(
  track: Track, timeline?: ReturnType<typeof readTimeline>,
): MusicEvent[] {
  const events = new Map<number, { labels: string[]; reasons: string[] }>();
  function add(timeMs: number, label: string, reason: string) {
    const event = events.get(timeMs) ?? { labels: [], reasons: [] };
    event.labels.push(label);
    event.reasons.push(reason);
    events.set(timeMs, event);
  }

  for (const marker of track.markers) {
    if (marker.kind === "hit") {
      const strength = marker.strength === undefined ? "" : " Relative strength: " + Math.round(marker.strength * 100) + "%.";
      add(marker.timeMs, "Detected hit", "A sharp rise in loudness or brightness suggested this accent." + strength);
    } else if (marker.timeMs === 0) {
      add(marker.timeMs, "Track start", "Marks the start of the first section.");
    } else {
      add(marker.timeMs, "Section change", "A sustained change in level or texture suggested a boundary.");
    }
  }
  add(track.durationMs, "End of track", "The session stops at the end of the audio.");

  const cues = new Map(timeline?.cues.map(cue => [cue.timeMs, cue]));
  const sections = timeline?.lines.filter(line => line.kind === "SECTION") ?? [];
  const editedTimes = new Set(timeline?.lines.map(line => line.timeMs));
  const detected = new Set(track.markers.map(marker => marker.kind + ":" + marker.timeMs));
  for (const line of timeline?.lines ?? []) {
    if (line.kind === "STOP") continue;
    const kind = line.kind === "HIT" ? "hit" : "section";
    if (!detected.has(kind + ":" + line.timeMs)) {
      if (line.kind === "SECTION" && line.note.startsWith("Auto · ")) {
        add(line.timeMs, "Planned boundary", "Auto placed a practice or recovery boundary within a musical section.");
      } else {
        add(line.timeMs, line.kind === "HIT" ? "Edited hit" : "Edited section", "This marker was added or moved in the timeline.");
      }
    }
  }
  for (const cue of timeline?.cues ?? []) {
    if (!events.has(cue.timeMs)) add(cue.timeMs, "Scheduled cycle", "A repeat was placed within the assigned section.");
  }

  return Array.from(events, ([timeMs, event]) => {
    const cue = cues.get(timeMs);
    const nextSection = sections.findIndex(line => line.timeMs > timeMs);
    const section = sections[nextSection < 0 ? sections.length - 1 : nextSection - 1];
    let action = "Candidate · No drill assigned at this marker.";
    if (!timeline) action = "Fix the timeline to see its drill assignments.";
    else if (cue?.command === "STOP") action = "Stop · Ends the session.";
    else if (cue?.command === "INLINE") {
      action = section?.drill
        ? cue.drill.name + " · Scheduled by the section assignment."
        : cue.drill.name + " · Assigned to this hit in the edited timeline.";
    } else if (section?.drill) action = "Candidate · " + section.drill.name + " is scheduled by the section.";
    else if (!editedTimes.has(timeMs)) action = "Candidate · Kept in the detected events, with no timeline marker.";
    if (section?.timeMs === timeMs && section.note && cue?.command !== "STOP") action += " " + section.note;
    return { timeMs, title: event.labels.join(" · "), detail: event.reasons.join(" "), action };
  }).sort((a, b) => a.timeMs - b.timeMs);
}
