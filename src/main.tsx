import { useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Drill } from "./catalog.js";
import { novaPatterns, prepareAutoDrill, readCustomDrills, saveCustomDrill, skillLimits, validateAutoBalls } from "./autoDrills.js";
import type { Skill } from "./autoDrills.js";
import { exportTimeline, feedRate, tagline, timestamp, validateTrack } from "./generator.js";
import type { Profile } from "./generator.js";
import { readTimeline, suggestTimeline } from "./score.js";
import { autoCuesToBlocks } from "./autoTransfer.js";
import { TimelinePreview } from "./TimelinePreview.js";
import { ManualEditor } from "./ManualEditor.js";
import { compileManualScore, defaultSession } from "./manualScore.js";
import type { Ball, Block } from "./manualScore.js";
import { analyzeFile } from "./rhythm.js";
import type { Track } from "./rhythm.js";
import "./style.css";

function App() {
  const tabs = ["music", "manual", "preview"] as const;
  const [tab, setTab] = useState<typeof tabs[number]>("music");
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [session, setSession] = useState(defaultSession);
  const [file, setFile] = useState<File>();
  const [track, setTrack] = useState<Track>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Drill[]>(() => novaPatterns.filter(drill => drill.name === "Forehand Drive"));
  const [custom, setCustom] = useState(readCustomDrills);
  const [drillQuery, setDrillQuery] = useState("");
  const [libraryTab, setLibraryTab] = useState<"Nova Drills" | "Custom">("Nova Drills");
  const [profile, setProfile] = useState<Profile>({
    pace: "steady", handedness: "right", skill: "Novice",
  });
  const draft = useMemo(() => track ? compileManualScore(track, blocks, session) : undefined, [track, blocks, session]);
  const request = useRef(0);

  async function load(file: File | undefined) {
    const id = ++request.current;
    setFile(file);
    setTrack(undefined);
    setBlocks([]);
    setError("");

    setBusy(Boolean(file));
    if (!file) return;
    try {
      const analyzed = await analyzeFile(file);
      // Decoding can finish out of order if the user picks another file while we wait.
      if (id !== request.current) return;
      validateTrack(analyzed);
      setTrack(analyzed);

    } catch (failure) {
      if (id === request.current) setError(failure instanceof Error ? failure.message : String(failure));
    } finally {
      if (id === request.current) setBusy(false);
    }
  }

  function configure<K extends keyof Profile>(key: K, value: Profile[K]) {
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

  const feedBpm = feedRate(profile);
  const skill = profile.skill ?? "Novice";
  const prepared = selected.map(drill => prepareAutoDrill(drill, profile));
  const query = drillQuery.trim().toLowerCase();
  const library = libraryTab === "Nova Drills" ? novaPatterns : custom;
  const visibleDrills = library.filter(drill => (drill.name + " " + drill.description).toLowerCase().includes(query));
  function generateTimeline() {
    if (!track) return;
    setError("");
    try {
      for (const drill of prepared) if (drill.parameters) validateAutoBalls(drill.parameters, skill);
      const score = suggestTimeline(track, prepared, feedBpm);
      const { cues } = readTimeline(score, track.durationMs, prepared, feedBpm);
      if (cues.length <= 1) throw new Error("No complete practice cycle fits. Try another drill or use MSYNC Editor.");
      exportTimeline(track, cues, profile, feedBpm);
      const nextBlocks = autoCuesToBlocks(cues, profile, feedBpm);
      // Build the replacement first. A failed generation or canceled prompt leaves the draft intact.
      const hasSessionEdits = session.COUNTDOWN !== defaultSession.COUNTDOWN
        || session.CYCLE_PAUSE !== defaultSession.CYCLE_PAUSE || session.ROBOT_LEAD !== defaultSession.ROBOT_LEAD;
      if ((blocks.length || hasSessionEdits) && !window.confirm("Replace the current MSYNC Editor draft with this Auto timeline?")) return;
      setBlocks(nextBlocks);
      // Auto omits SESSION. Preserve the frozen format’s implicit values on transfer.
      setSession({ ...defaultSession, ROBOT_LEAD: "1.3" });
      setTab("preview");
      document.getElementById("preview-tab")?.focus();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure));
    }
  }

  function saveDrill(name: string, balls: Ball[], random: boolean) {
    try {
      setCustom(saveCustomDrill(custom, name, balls, random));
      return "Saved to Training Library → Custom.";
    } catch (failure) {
      return failure instanceof Error ? failure.message : String(failure);
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
            {item === "preview" ? "Preview" : item === "manual" ? "MSYNC Editor" : "Music"}
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
        <form onSubmit={event => { event.preventDefault(); generateTimeline(); }}>
          <section>
            <h3>Training Profile</h3>
            <div className="fields">
              <label>Player skill<select value={skill} onChange={event => configure("skill", event.target.value as Skill)}>
                {Object.keys(skillLimits).map(level => <option key={level}>{level}</option>)}
              </select></label>
              <label>Pace<select value={profile.pace} onChange={event => configure("pace", event.target.value as Profile["pace"])}><option value="steady">Steady</option><option value="active">Active</option></select></label>
              <label>Racket hand<select value={profile.handedness} onChange={event => configure("handedness", event.target.value as Profile["handedness"])}><option value="right">Right</option><option value="left">Left</option></select></label>
            </div>
            <button className="generate-button" disabled={!track || busy} type="submit">Generate Timeline</button>
          </section>
        </form>
        <section>
          <h2>Training library</h2>
          <div className="tabs" role="group" aria-label="Training library categories">
            {(["Nova Drills", "Custom"] as const).map(item => <button type="button" key={item}
              aria-pressed={libraryTab === item} onClick={() => { setLibraryTab(item); setDrillQuery(""); }}>{item}</button>)}
          </div>
          <label>Search drills<input type="search" value={drillQuery} onChange={event => setDrillQuery(event.target.value)} /></label>
          <p className="hint" role="status">{selected.length} selected · {visibleDrills.length} of {library.length} drills shown</p>
          <div className="drill-library" role="group" aria-label="Available drills" tabIndex={0}>
          {visibleDrills.length === 0 && <p>No matching drills.</p>}
          {visibleDrills.map(drill => (
            <div className="drill" key={drill.id}>
              <label>
                <input type="checkbox" checked={selected.includes(drill)} onChange={event => {
                  const checked = event.target.checked;
                  setSelected(previous => checked ? [...previous, drill] : previous.filter(item => item.id !== drill.id));
                }} />
                <span><strong>{drill.name}</strong><small className="drill-description">{drill.description}</small></span>
              </label>
              <div className="drill-parameters">{drill.parameters?.map((ball, index) =>
                <small key={index}>{drill.parameters!.length > 1 && (index + 1) + ". "}
                  SD: {ball.SPEED} · SP: {ball.SPIN} · HT: {ball.HEIGHT} · DR: {ball.DROP} · TP: {ball.TYPE.toUpperCase()}
                </small>)}</div>
            </div>
          ))}
          </div>
        </section>
        {error && tab === "music" && <p role="alert">{error}</p>}
      </div>
      <div id="preview-panel" role="tabpanel" aria-labelledby="preview-tab" hidden={tab !== "preview"}>
        {tab === "preview" && (draft && file && track ? (
          <TimelinePreview file={file} draft={draft} durationMs={track.durationMs}
            onDownload={() => download(draft.source)} />
        ) : <section><p>Choose an audio file in Music to start a timeline.</p></section>)}
      </div>
      {tab === "manual" && <div id="manual-panel" role="tabpanel" aria-labelledby="manual-tab">
        {file && track && draft
          ? <ManualEditor file={file} track={track} draft={draft}
              blocks={blocks} onChange={setBlocks} onDownload={download} session={session} onSessionChange={setSession} onSaveCustom={saveDrill} />
          : <section><p>{busy ? "Analyzing audio…" : "Choose an audio file in the Music tab to start editing."}</p></section>}
      </div>}
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<App />);
