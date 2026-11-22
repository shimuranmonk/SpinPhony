import { useEffect, useRef, useState } from "react";
import type { Drill } from "./catalog.js";
import { timestamp } from "./generator.js";
import type { Cue } from "./generator.js";

type Props = {
  file: File;
  cues: Cue[];
  drills: Drill[];
  feedBpm: number;
  validationError: string;
  canDownload: boolean;
  onDownload: () => void;
  onEdit: (cues: Cue[]) => void;
};

function activeCueAt(cues: Cue[], seconds: number) {
  const next = cues.findIndex(cue => cue.timeMs > seconds * 1000);
  return next === -1 ? cues.length - 1 : next - 1;
}

export function TimelinePreview(props: Props) {
  const { file, cues, drills, feedBpm, validationError, canDownload, onDownload, onEdit } = props;
  const audio = useRef<HTMLAudioElement>(null);
  const windowRef = useRef<HTMLOListElement>(null);
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
      setActive(activeCueAt(cues, player.currentTime));
      frame = requestAnimationFrame(update);
    }
    update();
    return () => cancelAnimationFrame(frame);
  }, [cues, playback]);

  useEffect(() => {
    const list = windowRef.current;
    const row = list?.children[active];
    if (!list || !row || active < 0) return;
    const bounds = list.getBoundingClientRect();
    const cue = row.getBoundingClientRect();
    if (cue.top < bounds.top) list.scrollTop += cue.top - bounds.top;
    else if (cue.bottom > bounds.bottom) list.scrollTop += cue.bottom - bounds.bottom;
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
    if (player) setActive(activeCueAt(cues, player.currentTime));
    setPlayback("paused");
  }

  function updateCue(index: number, changes: { timeMs?: number; drill?: Drill; note?: string }) {
    if (playback !== "stopped") stop();
    onEdit(cues.map((cue, position) => position === index ? { ...cue, ...changes } : cue));
  }

  return (
    <section className="result" aria-labelledby="timeline">
      <audio ref={audio} onEnded={() => {
        setPlayback("ended");
        setActive(cues.length - 1);
      }} />
      <div className="result-header">
        <div><h2 id="timeline">Timeline</h2><p>{cues.length} cues · {feedBpm} balls/min</p></div>
        <button disabled={!canDownload} onClick={onDownload}>Download .msync</button>
      </div>
      <p className="hint">Cue times are in milliseconds from the start of the track.</p>
      {validationError && <p role="alert">{validationError}</p>}
      {playbackError && <p role="alert">{playbackError}</p>}
      <div className="timeline-window">
        <div className="transport" role="group" aria-label="Playback controls">
          <button disabled={!canDownload || playback === "playing" || playback === "paused"} onClick={() => void play(true)}>Play</button>
          <button disabled={playback !== "playing"} onClick={pause}>Pause</button>
          <button disabled={playback !== "paused"} onClick={() => void play(false)}>Resume</button>
          <button disabled={playback === "stopped"} onClick={stop}>Stop</button>
        </div>
        <ol ref={windowRef} tabIndex={0} aria-label="Editable timeline cues">
          {cues.map((cue, index) => (
            <li key={index} aria-current={active === index ? "step" : undefined}>
              {cue.command === "STOP" ? <><time>{timestamp(cue.timeMs)}</time><span>Stop</span></> : (
                <>
                  <input aria-label={`Cue ${index + 1} time (ms)`} type="number" min="0" step="1"
                    value={Number.isNaN(cue.timeMs) ? "" : cue.timeMs}
                    onChange={event => updateCue(index, { timeMs: event.target.valueAsNumber })} />
                  {cue.command === "INLINE" ? (
                    <select aria-label={`Cue ${index + 1} drill`} value={cue.drill.id} onChange={event => {
                      const drill = drills.find(item => item.id === event.target.value);
                      if (drill) updateCue(index, { drill });
                    }}>
                      {drills.map(drill => <option key={drill.id} value={drill.id}>{drill.name}</option>)}
                    </select>
                  ) : <span>Recovery</span>}
                </>
              )}
              <input className="cue-note" aria-label={`Cue ${index + 1} comment`} type="text"
                maxLength={200} placeholder="Optional comment" value={cue.note ?? ""}
                onChange={event => updateCue(index, { note: event.target.value })} />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
