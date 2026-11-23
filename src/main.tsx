import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { drills, starterDrills } from "./catalog.js";
import type { Drill } from "./catalog.js";
import { exportTimeline, feedRate, timestamp } from "./generator.js";
import type { Profile } from "./generator.js";
import { readTimeline, suggestTimeline } from "./score.js";
import { TimelinePreview } from "./TimelinePreview.js";
import { analyzeFile } from "./rhythm.js";
import type { Track } from "./rhythm.js";
import "./style.css";

function App() {
  const [tab, setTab] = useState<"setup" | "preview">("setup");
  const [file, setFile] = useState<File>();
  const [track, setTrack] = useState<Track>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Drill[]>(starterDrills);
  const [drillQuery, setDrillQuery] = useState("");
  const [drillSource, setDrillSource] = useState("");
  const [profile, setProfile] = useState<Profile>({
    pace: "steady", handedness: "right",
  });
  const [score, setScore] = useState<string>();
  const request = useRef(0);

  async function load(file: File | undefined) {
    const id = ++request.current;
    setFile(file);
    setTrack(undefined);
    setScore(undefined);
    setError("");

    setBusy(Boolean(file));
    if (!file) return;
    try {
      const analyzed = await analyzeFile(file);
      if (id !== request.current) return;
      setTrack(analyzed);

    } catch (failure) {
      if (id === request.current) setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function configure<K extends keyof Profile>(key: K, value: Profile[K]) {
    setScore(undefined);
    setProfile(previous => ({ ...previous, [key]: value }));
  }

  function download() {
    if (!track || !source) return;
    const url = URL.createObjectURL(new Blob([source], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = track.filename.replace(/\.[^.]+$/, "") + ".msync";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let timelineError = "";
  let source = "";
  let musicLines: ReturnType<typeof readTimeline>["lines"] = [];
  const feedBpm = track ? feedRate(track, profile) : 60;
  const query = drillQuery.trim().toLowerCase();
  const visibleDrills = drills.filter(drill =>
    (!drillSource || drill.category === drillSource)
    && (drill.name + " " + drill.description).toLowerCase().includes(query));
  if (track && score !== undefined) {
    try {
      const timeline = readTimeline(score, track.durationMs, selected, feedBpm);
      musicLines = timeline.lines;
      if (timeline.cues.length > 1) source = exportTimeline(track, timeline.cues, profile, feedBpm);
      else timelineError = "Assign a drill to a hit or section to enable download.";
    } catch (failure) {
      timelineError = failure instanceof Error ? failure.message : String(failure);
    }
  }

  return (
    <main>
      <header>
        <p className="brand">SpinPhony</p>
        <h1>MSYNC Generator</h1>
        <p>Turn a local music track into a timed table tennis practice session.</p>
      </header>
      <div className="tabs" role="tablist" aria-label="SpinPhony" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === "Home" ? "setup" : event.key === "End" ? "preview"
          : tab === "setup" ? "preview" : "setup";
        setTab(next);
        document.getElementById(next + "-tab")?.focus();
      }}>
        {(["setup", "preview"] as const).map(item => (
          <button key={item} id={item + "-tab"} role="tab" type="button" aria-selected={tab === item}
            aria-controls={item + "-panel"} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)}>
            {item === "setup" ? "Setup" : "Preview"}
          </button>
        ))}
      </div>
      <form id="setup-panel" role="tabpanel" aria-labelledby="setup-tab" hidden={tab !== "setup"} onSubmit={event => {
        event.preventDefault();
        if (!track) return;
        setError("");
        try {
          setScore(suggestTimeline(track, selected));
          setTab("preview");
          document.getElementById("preview-tab")?.focus();
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
            {track && <p>{track.filename} · {timestamp(track.durationMs)}
              {" · " + track.markers.filter(marker => marker.kind === "hit").length + " hits"}
              {" · " + track.markers.filter(marker => marker.kind === "section").length + " sections"}
              {track.rhythm ? " · About " + track.rhythm.bpm + " BPM" : ""}</p>}
          </div>
        </section>
        <section>
          <h2>Training library</h2>
          <div className="fields">
            <label>Search drills<input type="search" value={drillQuery} onChange={event => setDrillQuery(event.target.value)} /></label>
            <div className="drill-source"><label htmlFor="drill-source">Source</label>
            <select id="drill-source" value={drillSource} onChange={event => setDrillSource(event.target.value)}>
              <option value="">All sources</option><option>Nova S Pro manual</option><option>Coaching drill</option>
            </select></div>
          </div>
          <p className="hint" role="status">{selected.length} selected · {visibleDrills.length} of {drills.length} drills shown</p>
          <div className="drill-library" role="group" aria-label="Available drills" tabIndex={0}>
          {visibleDrills.length === 0 && <p>No matching drills.</p>}
          {visibleDrills.map(drill => (
            <div className="drill" key={drill.id}>
              <label>
                <input type="checkbox" checked={selected.includes(drill)} onChange={event => {
                  setScore(undefined);
                  const checked = event.target.checked;
                  setSelected(previous => [...starterDrills, ...drills.filter(item => !starterDrills.includes(item))]
                    .filter(item => item === drill ? checked : previous.includes(item)));
                }} />
                <span><strong>{drill.name}</strong><small>{drill.description}</small></span>
              </label>
              <a href={drill.source} target="_blank" rel="noreferrer">{drill.category}</a>
            </div>
          ))}
          </div>
        </section>
        <section>
          <h2>Training profile</h2>
          <div className="fields">
            <label>Pace<select value={profile.pace} onChange={event => configure("pace", event.target.value as Profile["pace"])}><option value="steady">Steady</option><option value="active">Active</option></select></label>
            <label>Racket hand<select value={profile.handedness} onChange={event => configure("handedness", event.target.value as Profile["handedness"])}><option value="right">Right</option><option value="left">Left</option></select></label>
          </div>
        </section>
        {error && <p role="alert">{error}</p>}
        <button disabled={!track || busy} type="submit">Generate timeline</button>
      </form>
      <div id="preview-panel" role="tabpanel" aria-labelledby="preview-tab" hidden={tab !== "preview"}>
        {tab === "preview" && (score !== undefined && file ? (
          <TimelinePreview file={file} text={score} lines={musicLines} drills={selected} feedBpm={feedBpm}
            validationError={timelineError} canDownload={Boolean(source)} onDownload={download}
            onEdit={setScore} />
        ) : <section><p>Generate a timeline in Setup to preview it here.</p></section>)}
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
