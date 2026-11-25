import { timestamp } from "./generator.js";
import { blockLabel, blockOrder } from "./manualScore.js";
import type { Block, BlockKind } from "./manualScore.js";

export type CueMapEntry = { id: number; timeMs: number; kind: BlockKind; label: string; durationMs?: number };

export function blocksToCueMap(blocks: Block[], durationMs: number): CueMapEntry[] {
  const sorted = [...blocks].sort((a, b) => a.timeMs - b.timeMs || blockOrder[a.kind] - blockOrder[b.kind]);
  const stopTime = sorted.find(item => item.kind === "STOP" && Number.isFinite(item.timeMs))?.timeMs ?? durationMs;
  return sorted.filter(item => Number.isFinite(item.timeMs) && item.timeMs >= 0
    && item.timeMs <= (item.kind === "FLAG" ? durationMs : Math.min(stopTime, durationMs)))
    .map(item => ({
      id: item.id, timeMs: item.timeMs, kind: item.kind, label: blockLabel(item),
      durationMs: item.kind === "CDRILL" && item.once ? item.balls.reduce((total, ball) =>
        total + (ball.BPM > 0 ? ball.REPS * 60000 / ball.BPM : 0), 0) : undefined,
    }));
}

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
