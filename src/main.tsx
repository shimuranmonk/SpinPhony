import { useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { drills, starterDrills } from "./catalog.js";
import type { Drill } from "./catalog.js";
import { exportTimeline, feedRate, tagline, timestamp } from "./generator.js";
import type { Profile } from "./generator.js";
import { readTimeline, suggestTimeline } from "./score.js";
import { describeMusicEvents } from "./musicEvents.js";
import { TimelinePreview } from "./TimelinePreview.js";
import { ManualEditor } from "./ManualEditor.js";
import { defaultSession } from "./manualScore.js";
import type { Block } from "./manualScore.js";
import { analyzeFile } from "./rhythm.js";
import type { Track } from "./rhythm.js";
import "./style.css";

function App() {
  const tabs = ["music", "manual", "setup", "preview"] as const;
  const [tab, setTab] = useState<typeof tabs[number]>("music");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [session, setSession] = useState(defaultSession);
  const [file, setFile] = useState<File>();
  const [track, setTrack] = useState<Track>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Drill[]>(() => starterDrills.slice(0, 1));
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
    setBlocks([]);
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

  function download(downloadSource: string) {
    if (!track || !downloadSource) return;
    const url = URL.createObjectURL(new Blob([downloadSource], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = track.filename.replace(/\.[^.]+$/, "") + ".msync";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  let timelineError = "";
  let source = "";
  let timeline: ReturnType<typeof readTimeline> | undefined;
  const feedBpm = track ? feedRate(track, profile) : 60;
  const query = drillQuery.trim().toLowerCase();
  const visibleDrills = drills.filter(drill =>
    (!drillSource || drill.category === drillSource)
    && (drill.name + " " + drill.description).toLowerCase().includes(query));
  if (track && score !== undefined) {
    try {
      timeline = readTimeline(score, track.durationMs, selected, feedBpm);
      if (timeline.cues.length > 1) source = exportTimeline(track, timeline.cues, profile, feedBpm);
      else timelineError = "Assign a drill to a hit or section to enable download.";
    } catch (failure) {
      timelineError = failure instanceof Error ? failure.message : String(failure);
    }
  }

  return (
    <main>
      <header>
        <h1>SpinPhony - {tagline}</h1>
        <p>An MSYNC conductor for the Nova Prime controller.</p>
      </header>
      <div className="tabs" role="tablist" aria-label="SpinPhony" onKeyDown={event => {
        if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const offset = event.key === "ArrowLeft" ? -1 : 1;
        const next = event.key === "Home" ? tabs[0] : event.key === "End" ? tabs[tabs.length - 1]
          : tabs[(tabs.indexOf(tab) + offset + tabs.length) % tabs.length];
        setTab(next);
        document.getElementById(next + "-tab")?.focus();
      }}>
        {tabs.map(item => (
          <button key={item} id={item + "-tab"} role="tab" type="button" aria-selected={tab === item}
            aria-controls={item + "-panel"} tabIndex={tab === item ? 0 : -1} onClick={() => setTab(item)}>
            {item === "setup" ? "Auto (under development)" : item === "preview" ? "Preview" : item === "manual" ? "MSYNC Editor" : "Music"}
          </button>
        ))}
      </div>
      <div id="music-panel" role="tabpanel" aria-labelledby="music-tab" hidden={tab !== "music"}>
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
              {drill.category === "Nova S Pro manual" ? <small>{drill.category}</small>
                : <a href={drill.source} target="_blank" rel="noreferrer">{drill.category}</a>}
            </div>
          ))}
          </div>
        </section>
        {error && tab === "music" && <p role="alert">{error}</p>}
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
          <h2>Training profile</h2>
          <div className="fields">
            <label>Pace<select value={profile.pace} onChange={event => configure("pace", event.target.value as Profile["pace"])}><option value="steady">Steady</option><option value="active">Active</option></select></label>
            <label>Racket hand<select value={profile.handedness} onChange={event => configure("handedness", event.target.value as Profile["handedness"])}><option value="right">Right</option><option value="left">Left</option></select></label>
          </div>
        </section>
        {error && <p role="alert">{error}</p>}
        {!track && <p>Choose an audio file in the Music tab to generate a timeline.</p>}
        <button disabled={!track || busy} type="submit">Generate timeline</button>
      </form>
      <div id="preview-panel" role="tabpanel" aria-labelledby="preview-tab" hidden={tab !== "preview"}>
        {tab === "preview" && (score !== undefined && file && track ? (
          <TimelinePreview file={file} text={score} lines={timeline?.lines ?? []}
            events={describeMusicEvents(track, selected, timeline)} drills={selected} feedBpm={feedBpm}
            validationError={timelineError} canDownload={Boolean(source)} onDownload={() => download(source)}
            onEdit={setScore} />
        ) : <section><p>Generate a timeline in Auto to preview it here.</p></section>)}
      </div>
      {tab === "manual" && <div id="manual-panel" role="tabpanel" aria-labelledby="manual-tab">
        {file && track
          ? <ManualEditor file={file} track={track}
              blocks={blocks} onChange={setBlocks} onDownload={download} session={session} onSessionChange={setSession} />
          : <section><p>{busy ? "Analyzing audio…" : "Choose an audio file in the Music tab to start editing."}</p></section>}
      </div>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
