import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CueMap } from "./CueMap.js";
import type { Cue } from "./generator.js";
import type { Drill } from "./catalog.js";
import { cycleDuration, timestamp } from "./generator.js";
import type { MusicEvent } from "./musicEvents.js";
import { MsyncTextPreview } from "./MsyncTextPreview.js";

type Props = {
  file: File;
  text: string;
  source: string;
  cues: Cue[];
  durationMs: number;
  children?: ReactNode;
  onTransfer: () => void;
  lines: { timeMs: number; line: number }[];
  events: MusicEvent[];
  drills: Drill[];
  feedBpm: number;
  validationError: string;
  canDownload: boolean;
  onDownload: () => void;
  onEdit: (text: string) => void;
};

function activeIndexAt(markers: { timeMs: number }[], seconds: number) {
  let start = 0;
  let end = markers.length;
  while (start < end) {
    const middle = Math.floor((start + end) / 2);
    if (markers[middle].timeMs <= seconds * 1000) start = middle + 1;
    else end = middle;
  }
  return start - 1;
}

export function TimelinePreview(props: Props) {
  const { file, text, source, cues, durationMs, children, onTransfer, lines, events, drills, feedBpm, validationError, canDownload, onDownload, onEdit } = props;
  const rates = drills.flatMap(drill => drill.parameters?.map(ball => ball.BPM) ?? [feedBpm]).filter(Number.isFinite);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const audio = useRef<HTMLAudioElement>(null);
  const windowRef = useRef<HTMLTextAreaElement>(null);
  const eventListRef = useRef<HTMLOListElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [position, setPosition] = useState<number>();
  const [playbackError, setPlaybackError] = useState("");
  const active = position === undefined ? -1 : lines[activeIndexAt(lines, position)]?.line ?? -1;
  const activeEvent = position === undefined ? -1 : activeIndexAt(events, position);
  const mapEntries = source ? cues.map((cue, id) => cue.command === "INLINE"
    ? { id, timeMs: cue.timeMs, kind: "CDRILL" as const, label: "CDRILL - " + cue.drill.name,
        durationMs: cue.once ? cycleDuration(cue.drill, feedBpm) : undefined }
    : { id, timeMs: cue.timeMs, kind: cue.command, label: cue.command }) : [];

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

  useEffect(() => {
    const editor = windowRef.current;
    if (!editor || active < 0) return;
    const styles = getComputedStyle(editor);
    const height = parseFloat(styles.lineHeight);
    const top = parseFloat(styles.paddingTop) + active * height;
    if (top < editor.scrollTop) editor.scrollTop = top;
    else if (top + height > editor.scrollTop + editor.clientHeight) {
      editor.scrollTop = top + height - editor.clientHeight;
    }
    setScrollTop(editor.scrollTop);
  }, [active]);

  useEffect(() => {
    const list = eventListRef.current;
    const row = list?.children[activeEvent];
    if (!list || !row) return;
    const bounds = list.getBoundingClientRect();
    const event = row.getBoundingClientRect();
    if (event.top < bounds.top) list.scrollTop += event.top - bounds.top;
    else if (event.bottom > bounds.bottom) list.scrollTop += event.bottom - bounds.bottom;
  }, [activeEvent]);

  function seek(timeMs: number) {
    const player = audio.current;
    if (player) player.currentTime = timeMs / 1000;
    setPosition(timeMs / 1000);
  }

  return (
    <section className="result" aria-labelledby="timeline">
      <div className="result-header">
        <div><h2 id="timeline">Timeline</h2><p>{lines.length} markers{rates.length > 0
          && (" · " + (minRate === maxRate ? minRate : minRate + "–" + maxRate) + " balls/min")}</p></div>
        <div className="manual-ball-actions">
          <button disabled={!canDownload} onClick={onTransfer}>Edit in MSYNC Editor</button>
          <button disabled={!canDownload} onClick={onDownload}>Download .msync</button>
        </div>
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
      <p id="timeline-help" className="hint">
        Edit one marker per line. Format: <code>time | HIT or SECTION | drill name or - | comment</code>.
        Add <code>x5</code> after a section drill name to play five cycles before the next section.
        A section drill takes over from individual hit actions within that section.
      </p>
      <details><summary>Selected drill names</summary><ul>{drills.map(drill => <li key={drill.id}>{drill.name}</li>)}</ul></details>
      {validationError && <p role="alert">{validationError}</p>}
      {playbackError && <p role="alert">{playbackError}</p>}
      <div className="timeline-window">
        <div className="preview-panels">
          <div>
            <h3>Edit timeline</h3>
            <div className="score-editor">
              {active >= 0 && <div className="playing-line" aria-hidden="true"
                style={{ top: `calc(var(--score-padding) + ${active} * var(--score-line) - ${scrollTop}px)` }} />}
              <textarea ref={windowRef} aria-label="Editable timeline" aria-describedby="timeline-help"
                aria-invalid={Boolean(validationError)} wrap="off" spellCheck={false} value={text}
                onScroll={event => setScrollTop(event.currentTarget.scrollTop)}
                onChange={event => {
                  audio.current?.pause();
                  onEdit(event.target.value);
                }} />
            </div>
          </div>
          <div>
            <h3 id="music-events">Detected events and cues</h3>
            <ol ref={eventListRef} className="event-list" aria-labelledby="music-events" tabIndex={0}>
              {events.map((event, index) => (
                <li key={event.timeMs} aria-current={activeEvent === index ? "step" : undefined}>
                  <div className="event-title"><time>{timestamp(event.timeMs)}</time> <strong>{event.title}</strong></div>
                  <p>{event.detail}</p>
                  <p>{event.action}</p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
      <MsyncTextPreview source={source} timeMs={position === undefined ? undefined : Math.round(position * 1000)} />
      {children}
    </section>
  );
}
