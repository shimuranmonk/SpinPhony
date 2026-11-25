import { timestamp } from "./generator.js";
import type { BlockKind } from "./manualScore.js";

export type CueMapEntry = { id: number; timeMs: number; kind: BlockKind; label: string; durationMs?: number };

export function CueMap({ entries, durationMs, playhead, onSeek }: {
  entries: CueMapEntry[]; durationMs: number; playhead: number; onSeek: (entry: CueMapEntry) => void;
}) {
  const percent = (time: number) => 100 * Math.min(durationMs, Math.max(0, time)) / durationMs;
  return <div className={entries.some(entry => entry.kind === "FLAG") ? "cue-strip has-flags" : "cue-strip"}
    role="group" aria-label="Scheduled blocks on the audio timeline">
    {entries.map((entry, index) => {
      const marker = entry.kind === "STOP" || entry.kind === "FLAVOR" || entry.kind === "FLAG";
      const next = entries.slice(index + 1).find(item => item.kind !== "FLAVOR" && item.kind !== "FLAG")?.timeMs ?? durationMs;
      const end = Math.max(entry.timeMs, Math.min(next, entry.timeMs + (entry.durationMs ?? Infinity)));
      const label = entry.label + " · " + timestamp(entry.timeMs)
        + (marker ? "" : " to " + timestamp(Math.round(end)));
      return <button type="button" key={entry.id} data-block={entry.kind}
        className={marker ? "cue-pin" : "cue-span"} title={label} aria-label={label}
        style={{ left: percent(entry.timeMs) + "%", width: marker ? undefined : percent(end) - percent(entry.timeMs) + "%" }}
        onClick={() => onSeek(entry)}>{!marker && entry.label}</button>;
    })}
    <span className="cue-playhead" aria-hidden="true" style={{ left: percent(playhead) + "%" }} />
  </div>;
}
