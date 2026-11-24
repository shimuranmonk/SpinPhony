import { useEffect, useRef, useState } from "react";
import type { Drill } from "./catalog.js";
import { timestamp } from "./generator.js";
import type { MusicEvent } from "./musicEvents.js";

type Props = {
  file: File;
  text: string;
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
  const { file, text, lines, events, drills, feedBpm, validationError, canDownload, onDownload, onEdit } = props;
  const rates = drills.flatMap(drill => drill.parameters?.map(ball => ball.BPM) ?? [feedBpm]).filter(Number.isFinite);
  const minRate = Math.min(...rates);
  const maxRate = Math.max(...rates);
  const audio = useRef<HTMLAudioElement>(null);
  const windowRef = useRef<HTMLTextAreaElement>(null);
  const eventListRef = useRef<HTMLOListElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const playbackRequest = useRef(0);
  const [playback, setPlayback] = useState<"stopped" | "playing" | "paused" | "ended">("stopped");
  const [active, setActive] = useState(-1);
  const [activeEvent, setActiveEvent] = useState(-1);
  const [playbackError, setPlaybackError] = useState("");

  useEffect(() => {
    const player = audio.current;
    if (!player) return;
    const url = URL.createObjectURL(file);
    player.src = url;
    return () => {
      playbackRequest.current++;
      player.pause();
      player.removeAttribute("src");
      player.load();
      URL.revokeObjectURL(url);
    };
  }, [file]);

  useEffect(() => {
    if (playback !== "playing") return;
    let frame: number;
    function update() {
      const player = audio.current;
      if (!player) return;
      setActive(lines[activeIndexAt(lines, player.currentTime)]?.line ?? -1);
      setActiveEvent(activeIndexAt(events, player.currentTime));
      frame = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(frame);
  }, [lines, events, playback]);

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

  function stop() {
    playbackRequest.current++;
    const player = audio.current;
    if (player) {
      player.pause();
      if (player.readyState > 0) player.currentTime = 0;
    }
    setPlayback("stopped");
    setActive(-1);
    setActiveEvent(-1);
    setPlaybackError("");
  }

  async function play(fromStart: boolean) {
    const player = audio.current;
    if (!player) return;
    const id = ++playbackRequest.current;
    setPlaybackError("");
    if (fromStart) player.currentTime = 0;
    setPlayback("playing");
    try {
      await player.play();
    } catch {
      if (id !== playbackRequest.current) return;
      stop();
      setPlaybackError("The browser could not play this audio file.");
    }
  }

  function pause() {
    playbackRequest.current++;
    const player = audio.current;
    player?.pause();
    if (player) {
      setActive(lines[activeIndexAt(lines, player.currentTime)]?.line ?? -1);
      setActiveEvent(activeIndexAt(events, player.currentTime));
    }
    setPlayback("paused");
  }

  return (
    <section className="result" aria-labelledby="timeline">
      <audio ref={audio} onEnded={() => {
        setPlayback("ended");
        setActive(lines.at(-1)?.line ?? -1);
        setActiveEvent(events.length - 1);
      }} />
      <div className="result-header">
        <div><h2 id="timeline">Timeline</h2><p>{lines.length} markers{rates.length > 0
          && (" · " + (minRate === maxRate ? minRate : minRate + "–" + maxRate) + " balls/min")}</p></div>
        <button disabled={!canDownload} onClick={onDownload}>Download .msync</button>
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
        <div className="transport" role="group" aria-label="Playback controls">
          <button disabled={!lines.length || playback === "playing" || playback === "paused"} onClick={() => void play(true)}>Play</button>
          <button disabled={playback !== "playing"} onClick={pause}>Pause</button>
          <button disabled={playback !== "paused"} onClick={() => void play(false)}>Resume</button>
          <button disabled={playback === "stopped"} onClick={stop}>Stop</button>
        </div>
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
                  if (playback !== "stopped") stop();
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
    </section>
  );
}
