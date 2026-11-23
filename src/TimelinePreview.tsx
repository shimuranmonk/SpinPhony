import { useEffect, useRef, useState } from "react";
import type { Drill } from "./catalog.js";

type Props = {
  file: File;
  text: string;
  lines: { timeMs: number; line: number }[];
  drills: Drill[];
  feedBpm: number;
  validationError: string;
  canDownload: boolean;
  onDownload: () => void;
  onEdit: (text: string) => void;
};

function activeCueAt(lines: Props["lines"], seconds: number) {
  const next = lines.findIndex(cue => cue.timeMs > seconds * 1000);
  const index = next < 0 ? lines.length - 1 : next - 1;
  return lines[index]?.line ?? -1;
}

export function TimelinePreview(props: Props) {
  const { file, text, lines, drills, feedBpm, validationError, canDownload, onDownload, onEdit } = props;
  const audio = useRef<HTMLAudioElement>(null);
  const windowRef = useRef<HTMLTextAreaElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const playbackRequest = useRef(0);
  const [playback, setPlayback] = useState<"stopped" | "playing" | "paused" | "ended">("stopped");
  const [active, setActive] = useState(-1);
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
      setActive(activeCueAt(lines, player.currentTime));
      frame = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(frame);
  }, [lines, playback]);

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

  function stop() {
    playbackRequest.current++;
    const player = audio.current;
    if (player) {
      player.pause();
      if (player.readyState > 0) player.currentTime = 0;
    }
    setPlayback("stopped");
    setActive(-1);
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
    if (player) setActive(activeCueAt(lines, player.currentTime));
    setPlayback("paused");
  }

  return (
    <section className="result" aria-labelledby="timeline">
      <audio ref={audio} onEnded={() => {
        setPlayback("ended");
        setActive(lines.at(-1)?.line ?? -1);
      }} />
      <div className="result-header">
        <div><h2 id="timeline">Timeline</h2><p>{lines.length} markers · {feedBpm} balls/min</p></div>
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
    </section>
  );
}
