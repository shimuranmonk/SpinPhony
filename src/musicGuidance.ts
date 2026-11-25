import type { SectionProfile } from "./music.js";
import type { Track } from "./rhythm.js";

export type MusicLabel = "boundary" | "accent" | "beat" | "phrase" | "section" | "returning";
export type GuidanceMarker = { timeMs: number; labels: { kind: MusicLabel; text: string }[] };

export function musicGuidance(track: Track, showBeats: boolean): GuidanceMarker[] {
  const rows = new Map<number, GuidanceMarker["labels"]>();
  function add(timeMs: number, kind: MusicLabel, text: string) {
    const labels = rows.get(timeMs) ?? [];
    if (!labels.some(label => label.kind === kind && label.text === text)) labels.push({ kind, text });
    rows.set(timeMs, labels);
  }
  add(0, "boundary", "Start");
  add(track.durationMs, "boundary", "End");
  const inTrack = track.markers.filter(marker => marker.timeMs < track.durationMs);
  const sections = inTrack.filter(marker => marker.kind === "section");
  const hits = inTrack.filter(marker => marker.kind === "hit");
  for (const hit of hits) add(hit.timeMs, "accent", "Accent");
  for (const section of sections) if (section.timeMs > 0) add(section.timeMs, "section", "Section change");

  const peakLevel = Math.max(.001, ...sections.map(section => section.profile?.level ?? 0));
  const peakBrightness = Math.max(.001, ...sections.map(section => section.profile?.brightness ?? 0));
  function similar(a?: SectionProfile, b?: SectionProfile) {
    return a && b && Math.abs(a.hitsPerSecond - b.hitsPerSecond) <= .45
      && Math.hypot((a.level - b.level) / peakLevel, (a.brightness - b.brightness) / peakBrightness) <= .12;
  }
  const grouped = new Set<number>();
  let group = 0;
  for (const [i, section] of sections.entries()) {
    if (grouped.has(i)) continue;
    const repeats = sections.flatMap((candidate, j) =>
      j > i + 1 && !grouped.has(j) && similar(section.profile, candidate.profile)
        && sections.slice(i + 1, j).some(middle => middle.profile && !similar(section.profile, middle.profile))
        ? [j] : []);
    if (!repeats.length) continue;
    const label = "Section " + (group < 26 ? String.fromCharCode(65 + group) : String(group + 1)) + " (estimated repeat)";
    group++;
    for (const member of [i, ...repeats]) {
      grouped.add(member);
      add(sections[member].timeMs, "returning", label);
    }
  }
  if (sections.length >= 3) {
    const first = sections[0];
    const last = sections.at(-1)!;
    if (first.profile && sections[1].profile && !grouped.has(0) && sections[1].timeMs <= 20000
      && first.profile.level < sections[1].profile.level * .65) add(first.timeMs, "section", "Possible intro");
    const prior = sections[sections.length - 2];
    if (last.profile && prior.profile && !grouped.has(sections.length - 1) && track.durationMs - last.timeMs <= 20000
      && last.profile.level < prior.profile.level * .65) add(last.timeMs, "section", "Possible outro");
  }

  const rhythm = track.rhythm;
  if (rhythm && Number.isFinite(rhythm.bpm) && rhythm.bpm > 0 && Number.isFinite(rhythm.firstBeatMs)) {
    const beatMs = 60000 / rhythm.bpm;
    const tolerance = Math.min(65, beatMs * .14);
    const nearBeat = (timeMs: number) => {
      const beat = (timeMs - rhythm.firstBeatMs) / beatMs;
      return Math.abs(beat - Math.round(beat)) * beatMs <= tolerance;
    };
    // A tempo estimate alone cannot establish sustained beat alignment or musical bar phase.
    const aligned = hits.filter(hit => nearBeat(hit.timeMs)).length;
    if (hits.length >= 6 && aligned / hits.length >= .6) {
      let hitIndex = 0;
      for (let beat = 0; ; beat++) {
        const timeMs = Math.round(rhythm.firstBeatMs + beat * beatMs);
        if (timeMs >= track.durationMs) break;
        if (timeMs < 0) continue;
        while (hitIndex + 1 < hits.length
          && Math.abs(hits[hitIndex + 1].timeMs - timeMs) <= Math.abs(hits[hitIndex].timeMs - timeMs)) hitIndex++;
        const hit = hits[hitIndex];
        const nearby = Math.abs(hit.timeMs - timeMs) <= tolerance;
        const markerTime = nearby ? hit.timeMs : timeMs;
        if (showBeats) add(markerTime, "beat", "Beat (estimated)");
        if (beat > 0 && beat % 8 === 0 && nearby && (hit.strength ?? 0) >= .7) {
          add(markerTime, "phrase", "Phrase boundary (estimated)");
        }
      }
    }
  }
  return [...rows].sort(([a], [b]) => a - b).map(([timeMs, labels]) => ({ timeMs, labels }));
}
