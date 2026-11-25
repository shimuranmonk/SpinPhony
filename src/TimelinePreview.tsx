import { useEffect, useRef, useState } from "react";
import { CueMap } from "./CueMap.js";
import { cycleDuration } from "./generator.js";
import type { Cue } from "./generator.js";
import { MsyncTextPreview } from "./MsyncTextPreview.js";

export function TimelinePreview({ file, source, cues, durationMs, feedBpm, onDownload }: {
  file: File; source: string; cues: Cue[]; durationMs: number; feedBpm: number; onDownload: () => void;
}) {
  const audio = useRef<HTMLAudioElement>(null);
  const [position, setPosition] = useState<number>();
  const [playbackError, setPlaybackError] = useState("");
  const mapEntries = cues.map((cue, id) => cue.command === "INLINE"
    ? { id, timeMs: cue.timeMs, kind: "CDRILL" as const, label: "CDRILL - " + cue.drill.name,
        durationMs: cue.once ? cycleDuration(cue.drill, feedBpm) : undefined }
    : { id, timeMs: cue.timeMs, kind: cue.command, label: cue.command });

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    const url = URL.createObjectURL(file);
    player.src = url;
    return () => {
      player.pause();
      player.removeAttribute("src");
      player.load();
      URL.revokeObjectURL(url);
    };
  }, [file]);

  function seek(timeMs: number) {
    const player = audio.current;
    if (player) player.currentTime = timeMs / 1000;
    setPosition(timeMs / 1000);
  }

  return (
    <section className="result" aria-labelledby="timeline">
      <div className="result-header">
        <h2 id="timeline">Timeline</h2>
        <button type="button" onClick={onDownload}>Download .msync</button>
      </div>
      <div className="manual-transport preview-transport">
        <audio ref={audio} controls aria-label="Track audio"
          onPlay={event => setPosition(event.currentTarget.currentTime)}
          onSeeked={event => setPosition(event.currentTarget.currentTime)}
          onTimeUpdate={event => setPosition(event.currentTarget.currentTime)}
          onError={() => setPlaybackError("The browser could not play this audio file.")} />
        <CueMap entries={mapEntries} durationMs={durationMs} playhead={(position ?? 0) * 1000}
          onSeek={entry => seek(entry.timeMs)} />
      </div>
      {playbackError && <p role="alert">{playbackError}</p>}
      <MsyncTextPreview source={source} timeMs={position === undefined ? undefined : Math.round(position * 1000)} />
    </section>
  );
}
