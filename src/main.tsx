import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { drills } from "./catalog.js";
import type { Drill } from "./catalog.js";
import { generate, timestamp } from "./generator.js";
import type { Profile } from "./generator.js";
import { analyzeFile } from "./rhythm.js";
import type { Track } from "./rhythm.js";
import "./style.css";

function App() {
  const [track, setTrack] = useState<Track>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [bpm, setBpm] = useState("");
  const [offset, setOffset] = useState("0");
  const [selected, setSelected] = useState<Drill[]>([...drills]);
  const [profile, setProfile] = useState<Profile>({
    pace: "steady", handedness: "right", workBeats: 16, recoveryBeats: 4,
  });
  const [result, setResult] = useState<ReturnType<typeof generate>>();
  const request = useRef(0);

  async function load(file: File | undefined) {
    const id = ++request.current;
    setTrack(undefined);
    setResult(undefined);
    setError("");
    setBpm("");
    setOffset("0");
    setBusy(Boolean(file));
    if (!file) return;
    try {
      const analyzed = await analyzeFile(file);
      if (id !== request.current) return;
      setTrack(analyzed);
      setBpm(analyzed.rhythm?.bpm.toString() ?? "");
      setOffset(String(analyzed.rhythm?.firstBeatMs ?? 0));
    } catch (failure) {
      if (id === request.current) setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function configure<K extends keyof Profile>(key: K, value: Profile[K]) {
    setResult(undefined);
    setProfile(previous => ({ ...previous, [key]: value }));
  }

  function download() {
    if (!track || !result) return;
    const url = URL.createObjectURL(new Blob([result.source], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = track.filename.replace(/\.[^.]+$/, "") + ".msync";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <main>
      <header>
        <p className="brand">SpinPhony</p>
        <h1>MSYNC Generator</h1>
        <p>Turn a local music track into a timed table tennis practice session.</p>
      </header>
      <form onSubmit={event => {
        event.preventDefault();
        if (!track) return;
        setError("");
        try {
          setResult(generate(track, { bpm: Number(bpm), firstBeatMs: Number(offset) }, selected, profile));
        } catch (failure) {
          setError(failure instanceof Error ? failure.message : String(failure));
        }
      }}>
        <section>
          <h2>Music</h2>
          <label>Audio file<input type="file" accept="audio/*,.wav,.mp3,.m4a,.ogg,.flac" onChange={event => void load(event.target.files?.[0])} /></label>
          <p className="hint">8 seconds to 6 minutes, up to 32 MiB. Audio stays in your browser.</p>
          <div role="status">
            {busy && <p>Analyzing audio…</p>}
            {track && <p>{track.filename} · {timestamp(track.durationMs)}{!track.rhythm && " · Enter the BPM manually"}</p>}
          </div>
          <div className="fields">
            <label>Tempo (BPM)<input required type="number" min="40" max="180" step="0.1" value={bpm} disabled={!track} onChange={event => { setBpm(event.target.value); setResult(undefined); }} /></label>
            <label>First beat (ms)<input required type="number" min="0" step="1" value={offset} disabled={!track} onChange={event => { setOffset(event.target.value); setResult(undefined); }} /></label>
          </div>
        </section>
        <section>
          <h2>Drills</h2>
          {drills.map(drill => (
            <div className="drill" key={drill.id}>
              <label>
                <input type="checkbox" checked={selected.includes(drill)} onChange={event => {
                  setResult(undefined);
                  setSelected(drills.filter(item => item === drill ? event.target.checked : selected.includes(item)));
                }} />
                <span><strong>{drill.name}</strong><small>{drill.description}</small></span>
              </label>
              <a href={drill.source} target="_blank" rel="noreferrer">{drill.category}</a>
            </div>
          ))}
        </section>
        <section>
          <h2>Training profile</h2>
          <div className="fields">
            <label>Pace<select value={profile.pace} onChange={event => configure("pace", event.target.value as Profile["pace"])}><option value="steady">Steady</option><option value="active">Active</option></select></label>
            <label>Racket hand<select value={profile.handedness} onChange={event => configure("handedness", event.target.value as Profile["handedness"])}><option value="right">Right</option><option value="left">Left</option></select></label>
            <label>Work (beats)<select value={profile.workBeats} onChange={event => configure("workBeats", Number(event.target.value))}>{[8, 16, 32].map(value => <option key={value}>{value}</option>)}</select></label>
            <label>Recovery (beats)<select value={profile.recoveryBeats} onChange={event => configure("recoveryBeats", Number(event.target.value))}>{[0, 4, 8].map(value => <option key={value}>{value}</option>)}</select></label>
          </div>
        </section>
        {error && <p role="alert">{error}</p>}
        <button disabled={!track || busy} type="submit">Generate timeline</button>
      </form>
      {result && (
        <section className="result" aria-labelledby="timeline" aria-live="polite">
          <div className="result-header">
            <div><h2 id="timeline">Timeline</h2><p>{result.cues.length} cues · {result.feedBpm} balls/min</p></div>
            <button onClick={download}>Download .msync</button>
          </div>
          <ol>{result.cues.map(cue => (
            <li key={cue.timeMs}><time>{timestamp(cue.timeMs)}</time>{cue.command === "INLINE" ? cue.drill.name : cue.command === "IDLE" ? "Recovery" : "Stop"}</li>
          ))}</ol>
        </section>
      )}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
