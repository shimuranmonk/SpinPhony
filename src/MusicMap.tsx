import { timestamp } from "./generator.js";
import type { GuidanceMarker, MusicLabel } from "./musicGuidance.js";

const legend: { kind: MusicLabel; text: string }[] = [
  { kind: "boundary", text: "Start / End" }, { kind: "accent", text: "Accent" },
  { kind: "phrase", text: "Phrase" }, { kind: "section", text: "Section" },
  { kind: "returning", text: "Return" }, { kind: "beat", text: "Beat" },
];
const lanes: Record<MusicLabel, number> = { boundary: 0, section: 1, returning: 2, phrase: 3, accent: 4, beat: 5 };

export function MusicMap({ markers, durationMs, playhead, showBeats, onToggleBeats, onSeek }: {
  markers: GuidanceMarker[]; durationMs: number; playhead: number; showBeats: boolean;
  onToggleBeats: (checked: boolean) => void; onSeek: (timeMs: number) => void;
}) {
  const percent = (timeMs: number) => Math.min(100, Math.max(0, 100 * timeMs / durationMs));
  return <div className="music-map">
    <div className="music-map-heading">
      <strong>Music Map</strong>
      <label><input type="checkbox" checked={showBeats} onChange={event => onToggleBeats(event.target.checked)} />Show beats</label>
    </div>
    <div className="music-map-track" role="group" aria-label="Detected music map">
      {markers.flatMap(marker => marker.labels.filter((label, i, labels) =>
        labels.findIndex(item => item.kind === label.kind) === i).map(label => {
          const title = timestamp(marker.timeMs) + " · " + marker.labels.map(item => item.text).join(" · ");
          return <button key={marker.timeMs + "-" + label.kind} type="button" data-music={label.kind}
            title={title} aria-label={title} style={{ left: percent(marker.timeMs) + "%", top: lanes[label.kind] * 6 + "px" }}
            onClick={() => onSeek(marker.timeMs)} />;
        }))}
      <span className="cue-playhead" aria-hidden="true" style={{ left: percent(playhead) + "%" }} />
    </div>
    <div className="music-map-legend">{legend.filter(item => item.kind !== "beat" || showBeats).map(item =>
      <span key={item.kind} data-music={item.kind}>{item.text}</span>)}</div>
  </div>;
}
